import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAgentRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentForUser } from "@/lib/agentContext";
import { saveApplicationDocument } from "@/lib/uploads";
import { logActivity } from "@/lib/activityLog";

// PUT /api/agent-portal/applications/:id/resubmit
// Corrects and resubmits a REJECTED application — same record, same
// workCode, full history preserved (no new application is created,
// per the spec). Accepts the same shape as the original submission:
// fieldValues (JSON) to update/add values, and requirement_<id> /
// common_<name> / customDocName+customDocFile to add or replace
// documents. Only fields/documents actually sent are touched —
// anything already on the application that isn't resent stays as is.
// On success: status -> PENDING_REVIEW, rejectionReason cleared, and
// it becomes visible to staff again. Still excluded from the agent's
// balance (PENDING_REVIEW), per the payment-timing rule.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAgentRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = (session.user as any).id as string;

  const agent = await getAgentForUser(userId);
  if (!agent) return NextResponse.json({ error: "No agent profile is linked to this login" }, { status: 404 });

  const application = await prisma.customerService.findFirst({
    where: { id: params.id, agentId: agent.id, deletedAt: null },
    include: { service: { include: { fields: true, documentRequirements: { where: { isActive: true } } } } },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (application.status !== "REJECTED") {
    return NextResponse.json({ error: "Only a rejected application can be resubmitted" }, { status: 409 });
  }

  const form = await req.formData();
  const fieldValuesRaw = form.get("fieldValues") as string | null;

  if (fieldValuesRaw) {
    let fieldValues: Record<string, string> = {};
    try {
      fieldValues = JSON.parse(fieldValuesRaw);
    } catch {
      return NextResponse.json({ error: "fieldValues must be valid JSON" }, { status: 400 });
    }
    for (const [fieldId, value] of Object.entries(fieldValues)) {
      if (value === undefined || value === null || value === "") continue;
      await prisma.applicationFieldValue.upsert({
        where: { customerServiceId_serviceFieldId: { customerServiceId: application.id, serviceFieldId: fieldId } },
        update: { value: String(value), updatedById: userId },
        create: { customerServiceId: application.id, serviceFieldId: fieldId, value: String(value), updatedById: userId },
      });
    }
  }

  for (const doc of application.service.documentRequirements) {
    const file = form.get(`requirement_${doc.id}`);
    if (!(file instanceof File)) continue;
    const saved = await saveApplicationDocument(file);
    if ("error" in saved) return NextResponse.json({ error: `${doc.name}: ${saved.error}` }, { status: 400 });
    await prisma.applicationDocument.create({
      data: {
        customerServiceId: application.id,
        requirementId: doc.id,
        documentName: doc.name,
        fileUrl: saved.url,
        uploadedById: userId,
      },
    });
  }
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("common_") || !(value instanceof File)) continue;
    const saved = await saveApplicationDocument(value);
    if ("error" in saved) continue;
    await prisma.applicationDocument.create({
      data: {
        customerServiceId: application.id,
        requirementId: null,
        documentName: key.replace("common_", ""),
        fileUrl: saved.url,
        uploadedById: userId,
      },
    });
  }
  const customNames = form.getAll("customDocName");
  const customFiles = form.getAll("customDocFile");
  for (let i = 0; i < customNames.length; i++) {
    const name = customNames[i];
    const file = customFiles[i];
    if (typeof name !== "string" || !name.trim() || !(file instanceof File)) continue;
    const saved = await saveApplicationDocument(file);
    if ("error" in saved) continue;
    await prisma.applicationDocument.create({
      data: {
        customerServiceId: application.id,
        requirementId: null,
        documentName: name.trim(),
        fileUrl: saved.url,
        uploadedById: userId,
      },
    });
  }

  // Re-check required documents are now all present before allowing
  // the resubmit to go through — otherwise it would bounce right
  // back to the employee missing the very thing that was rejected.
  const currentDocs = await prisma.applicationDocument.findMany({ where: { customerServiceId: application.id } });
  const satisfiedRequirementIds = new Set(currentDocs.map((d) => d.requirementId).filter(Boolean));
  const stillMissing = application.service.documentRequirements
    .filter((d) => d.required && !satisfiedRequirementIds.has(d.id))
    .map((d) => d.name);
  if (stillMissing.length > 0) {
    return NextResponse.json(
      { error: `Still missing required document(s): ${stillMissing.join(", ")}` },
      { status: 400 }
    );
  }

  const updated = await prisma.customerService.update({
    where: { id: application.id },
    data: { status: "PENDING_REVIEW", rejectionReason: null, updatedById: userId },
  });

  await logActivity({
    userId,
    action: "AGENT_APPLICATION_RESUBMITTED",
    entityType: "CustomerService",
    entityId: application.id,
    previousValue: { status: "REJECTED" },
    newValue: { status: "PENDING_REVIEW" },
  });

  return NextResponse.json({ application: updated });
}
