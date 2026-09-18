import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageServices } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  fieldType: z.enum(["TEXT", "NUMBER", "DATE", "EMAIL", "PHONE", "PASSWORD", "TEXTAREA", "SELECT", "CHECKBOX"]).optional(),
  options: z.array(z.string()).optional(),
  requiredAtSubmission: z.boolean().optional(),
  editableAfterSubmission: z.boolean().optional(),
  visibleToAgent: z.boolean().optional(),
  visibleToEmployee: z.boolean().optional(),
  visibleToAdmin: z.boolean().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/services/:id/fields/:fieldId — edit or reorder a field.
export async function PUT(req: NextRequest, { params }: { params: { id: string; fieldId: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageServices(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const field = await prisma.serviceField.update({
    where: { id: params.fieldId },
    data: parsed.data as any,
  });
  return NextResponse.json({ field });
}

// DELETE /api/services/:id/fields/:fieldId
// Soft-remove: mark inactive rather than hard-delete, so historical
// applications that already recorded a value for this field keep
// their data intact and reviewable.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; fieldId: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageServices(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.serviceField.update({ where: { id: params.fieldId }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
