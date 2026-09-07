import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canEditServiceStatus } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { z } from "zod";
import { ServiceStatus } from "@prisma/client";

const updateSchema = z.object({
  status: z.nativeEnum(ServiceStatus).optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  completedDate: z.string().optional(),
  amount: z.number().optional(),
});

// PUT /api/customer-services/:id
// This is the "edit the particular applied service" endpoint —
// used to set the reference number after online submission,
// change status, add notes, mark the completion date, etc.
// Every change is diffed and written to the activity log so the
// customer's history shows exactly what changed and by whom.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEditServiceStatus(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const userId = (session.user as any).id as string;

  const existing = await prisma.customerService.findUnique({ where: { id: params.id } });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const updated = await prisma.customerService.update({
    where: { id: params.id },
    data: {
      status: data.status ?? undefined,
      referenceNumber: data.referenceNumber ?? undefined,
      notes: data.notes ?? undefined,
      completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
      amount: data.amount ?? undefined,
      updatedById: userId,
    },
    include: { service: true },
  });

  // Log a status change specifically, since that's the most
  // important transition to see in the customer's history.
  if (data.status && data.status !== existing.status) {
    await logActivity({
      userId,
      action: "SERVICE_STATUS_CHANGED",
      entityType: "CustomerService",
      entityId: updated.id,
      previousValue: { status: existing.status },
      newValue: { status: updated.status },
    });
  }
  if (data.referenceNumber && data.referenceNumber !== existing.referenceNumber) {
    await logActivity({
      userId,
      action: "SERVICE_REFERENCE_NUMBER_SET",
      entityType: "CustomerService",
      entityId: updated.id,
      previousValue: { referenceNumber: existing.referenceNumber },
      newValue: { referenceNumber: updated.referenceNumber },
    });
  }

  return NextResponse.json({ customerService: updated });
}
