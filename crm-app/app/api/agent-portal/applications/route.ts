import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAgentRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentForUser } from "@/lib/agentContext";
import { findCustomerByMobile } from "@/lib/customerLookup";
import { nextWorkCode, nextCustomerCode } from "@/lib/codes";
import { saveApplicationDocument } from "@/lib/uploads";
import { logActivity } from "@/lib/activityLog";

// POST /api/agent-portal/applications
// The Agent's "Apply for Service" submission. Entirely generic —
// which fields/documents are required comes from the Service's own
// configuration (ServiceField / ServiceDocumentRequirement), never
// from an if/else on the service name.
//
// Multipart form fields:
//   customerId       — existing customer id, OR:
//   newCustomer      — JSON string {fullName, mobile, email?, address?,
//                       district?, state?, pincode?, dob?, gender?}
//   serviceId        — required
//   fieldValues      — JSON string { [serviceFieldId]: value }
//   requirement_<id> — File, one per ServiceDocumentRequirement satisfied
//   common_<name>    — File, optional common document (Aadhaar/Photo/Signature)
//   customDocName    — repeated text field, one per custom document
//   customDocFile    — repeated File field, same order as customDocName
//
// Status is ALWAYS "PENDING_REVIEW" and amount is ALWAYS the
// service's fixed agentPrice — neither is influenced by anything the
// agent sends. Per the payment-timing rule, PENDING_REVIEW is
// excluded from the agent's balance (see lib/agentContext.ts), so
// submitting never increases what the agent owes.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAgentRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = (session.user as any).id as string;

  const agent = await getAgentForUser(userId);
  if (!agent) return NextResponse.json({ error: "No agent profile is linked to this login" }, { status: 404 });

  const form = await req.formData();
  const customerId = form.get("customerId") as string | null;
  const newCustomerRaw = form.get("newCustomer") as string | null;
  const serviceId = form.get("serviceId") as string | null;
  const fieldValuesRaw = form.get("fieldValues") as string | null;

  if (!serviceId) return NextResponse.json({ error: "serviceId is required" }, { status: 400 });

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      fields: { where: { isActive: true } },
      documentRequirements: { where: { isActive: true } },
    },
  });
  if (!service || !service.isActive) {
    return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
  }

  // Resolve the customer: use the given id, or find-or-create by
  // mobile so we never create a duplicate even if the client-side
  // "check first" step was somehow skipped.
  let resolvedCustomerId = customerId;
  if (!resolvedCustomerId) {
    if (!newCustomerRaw) {
      return NextResponse.json({ error: "customerId or newCustomer is required" }, { status: 400 });
    }
    let newCustomer: any;
    try {
      newCustomer = JSON.parse(newCustomerRaw);
    } catch {
      return NextResponse.json({ error: "newCustomer must be valid JSON" }, { status: 400 });
    }
    if (!newCustomer.fullName || !newCustomer.mobile) {
      return NextResponse.json({ error: "New customer needs at least fullName and mobile" }, { status: 400 });
    }
    const existing = await findCustomerByMobile(newCustomer.mobile);
    if (existing) {
      resolvedCustomerId = existing.id;
    } else {
      const created = await prisma.customer.create({
        data: {
          customerCode: await nextCustomerCode(),
          fullName: newCustomer.fullName,
          mobile: newCustomer.mobile,
          email: newCustomer.email || null,
          address: newCustomer.address || null,
          district: newCustomer.district || null,
          state: newCustomer.state || null,
          pincode: newCustomer.pincode || null,
          dob: newCustomer.dob ? new Date(newCustomer.dob) : null,
          gender: newCustomer.gender || null,
          createdById: userId,
        },
      });
      resolvedCustomerId = created.id;
    }
  } else {
    const existing = await prisma.customer.findUnique({ where: { id: resolvedCustomerId } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
  }

  // Validate required fields.
  let fieldValues: Record<string, string> = {};
  if (fieldValuesRaw) {
    try {
      fieldValues = JSON.parse(fieldValuesRaw);
    } catch {
      return NextResponse.json({ error: "fieldValues must be valid JSON" }, { status: 400 });
    }
  }
  const missingFields = service.fields
    .filter((f) => f.requiredAtSubmission)
    .filter((f) => !fieldValues[f.id] || String(fieldValues[f.id]).trim() === "")
    .map((f) => f.label);
  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: `Missing required field(s): ${missingFields.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate required documents are present in the form.
  const missingDocs = service.documentRequirements
    .filter((d) => d.required)
    .filter((d) => !(form.get(`requirement_${d.id}`) instanceof File))
    .map((d) => d.name);
  if (missingDocs.length > 0) {
    return NextResponse.json(
      { error: `Missing required document(s): ${missingDocs.join(", ")}` },
      { status: 400 }
    );
  }

  // Everything validated — create the application. Price is ALWAYS
  // the fixed agent price, status ALWAYS PENDING_REVIEW.
  const workCode = await nextWorkCode();
  const application = await prisma.customerService.create({
    data: {
      workCode,
      customerId: resolvedCustomerId!,
      serviceId,
      agentId: agent.id,
      status: "PENDING_REVIEW",
      amount: service.agentPrice,
      createdById: userId,
    },
  });

  // Save field values.
  for (const field of service.fields) {
    const value = fieldValues[field.id];
    if (value === undefined || value === null || value === "") continue;
    await prisma.applicationFieldValue.create({
      data: {
        customerServiceId: application.id,
        serviceFieldId: field.id,
        value: String(value),
        updatedById: userId,
      },
    });
  }

  // Save configured-requirement documents.
  for (const doc of service.documentRequirements) {
    const file = form.get(`requirement_${doc.id}`);
    if (!(file instanceof File)) continue;
    const saved = await saveApplicationDocument(file);
    if ("error" in saved) {
      return NextResponse.json({ error: `${doc.name}: ${saved.error}` }, { status: 400 });
    }
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

  // Save common optional documents (Aadhaar/Photo/Signature or
  // whatever else was sent with a `common_` prefix).
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("common_") || !(value instanceof File)) continue;
    const documentName = key.replace("common_", "");
    const saved = await saveApplicationDocument(value);
    if ("error" in saved) continue; // skip invalid optional uploads rather than blocking submission
    await prisma.applicationDocument.create({
      data: {
        customerServiceId: application.id,
        requirementId: null,
        documentName,
        fileUrl: saved.url,
        uploadedById: userId,
      },
    });
  }

  // Save custom-named documents the agent added themselves.
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

  await logActivity({
    userId,
    action: "AGENT_APPLICATION_SUBMITTED",
    entityType: "CustomerService",
    entityId: application.id,
    newValue: { workCode: application.workCode, service: service.name },
  });

  return NextResponse.json({ application }, { status: 201 });
}
