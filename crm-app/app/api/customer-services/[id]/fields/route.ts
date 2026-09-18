import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canEditServiceStatus } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { z } from "zod";

const updateSchema = z.object({
  fieldValues: z.record(z.string()),
});

// PUT /api/customer-services/:id/fields
// Lets staff fill in/update a dynamic field's value AFTER submission
// — e.g. a Passport's "File Number" that didn't exist yet when the
// Agent applied. Only fields the service itself marks
// `editableAfterSubmission: true` can be touched here; anything else
// in the request body is silently ignored rather than erroring, so a
// form that sends a full snapshot of visible fields doesn't fail on
// the read-only ones.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEditServiceStatus(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = (session.user as any).id as string;

  const application = await prisma.customerService.findUnique({
    where: { id: params.id },
    include: { service: { include: { fields: { where: { isActive: true } } } } },
  });
  if (!application || application.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const editableFields = application.service.fields.filter((f) => f.editableAfterSubmission);
  const editableIds = new Set(editableFields.map((f) => f.id));

  let updatedCount = 0;
  for (const [fieldId, value] of Object.entries(parsed.data.fieldValues)) {
    if (!editableIds.has(fieldId)) continue; // not editable here — ignore rather than error
    await prisma.applicationFieldValue.upsert({
      where: { customerServiceId_serviceFieldId: { customerServiceId: application.id, serviceFieldId: fieldId } },
      update: { value, updatedById: userId },
      create: { customerServiceId: application.id, serviceFieldId: fieldId, value, updatedById: userId },
    });
    updatedCount++;
  }

  if (updatedCount > 0) {
    await logActivity({
      userId,
      action: "APPLICATION_FIELD_UPDATED",
      entityType: "CustomerService",
      entityId: application.id,
      newValue: { fieldsUpdated: updatedCount },
    });
  }

  return NextResponse.json({ success: true, updatedCount });
}
