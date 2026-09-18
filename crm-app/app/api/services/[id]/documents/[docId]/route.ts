import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageServices } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  required: z.boolean().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/services/:id/documents/:docId — edit/reorder a requirement.
export async function PUT(req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageServices(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const doc = await prisma.serviceDocumentRequirement.update({
    where: { id: params.docId },
    data: parsed.data,
  });
  return NextResponse.json({ document: doc });
}

// DELETE /api/services/:id/documents/:docId
// Soft-remove (isActive=false) so past applications' already-
// uploaded documents against this requirement stay linked/visible.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageServices(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.serviceDocumentRequirement.update({ where: { id: params.docId }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
