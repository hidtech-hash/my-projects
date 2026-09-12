import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  authOptions,
  canEditServiceStatus,
  canAssignWork,
  canManagePayments,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { z } from "zod";
import { ServiceStatus, PaymentStatus } from "@prisma/client";

const updateSchema = z.object({
  status: z.nativeEnum(ServiceStatus).optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  completedDate: z.string().optional(),
  agentId: z.string().nullable().optional(),
  assignedEmployeeId: z.string().nullable().optional(),
  // Price and payment figures — admin/manager only (see below).
  amount: z.number().optional(),
  amountReceived: z.number().optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
});

// PUT /api/customer-services/:id
// This is the "edit the particular applied service" endpoint —
// used to set the reference number after online submission,
// change status, add notes, mark the completion date, reassign
// employee/agent, or correct price/payment figures.
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

  // Reassigning WHO does the work is restricted to admin/manager.
  // Correcting WHICH agent referred it is allowed for anyone who can
  // edit the record at all — it's just data entry, no money attached
  // to the field itself (the price is a separate, gated field below).
  if (
    data.assignedEmployeeId !== undefined &&
    data.assignedEmployeeId !== userId &&
    !canAssignWork(role)
  ) {
    return NextResponse.json({ error: "Forbidden: cannot reassign work" }, { status: 403 });
  }

  const isTouchingMoney =
    data.amount !== undefined || data.amountReceived !== undefined || data.paymentStatus !== undefined;
  if (isTouchingMoney && !canManagePayments(role)) {
    return NextResponse.json({ error: "Forbidden: cannot edit price/payment" }, { status: 403 });
  }

  const updated = await prisma.customerService.update({
    where: { id: params.id },
    data: {
      status: data.status ?? undefined,
      referenceNumber: data.referenceNumber ?? undefined,
      notes: data.notes ?? undefined,
      completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
      agentId: data.agentId,
      assignedEmployeeId: data.assignedEmployeeId,
      amount: data.amount ?? undefined,
      amountReceived: data.amountReceived ?? undefined,
      paymentStatus: data.paymentStatus ?? undefined,
      updatedById: userId,
    },
    include: { service: true, agent: true },
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
  if (data.assignedEmployeeId !== undefined && data.assignedEmployeeId !== existing.assignedEmployeeId) {
    await logActivity({
      userId,
      action: "SERVICE_ASSIGNED",
      entityType: "CustomerService",
      entityId: updated.id,
      previousValue: { assignedEmployeeId: existing.assignedEmployeeId },
      newValue: { assignedEmployeeId: updated.assignedEmployeeId },
    });
  }
  if (data.agentId !== undefined && data.agentId !== existing.agentId) {
    await logActivity({
      userId,
      action: "SERVICE_LINKED_TO_AGENT",
      entityType: "CustomerService",
      entityId: updated.id,
      previousValue: { agentId: existing.agentId },
      newValue: { agentId: updated.agentId },
    });
  }
  if (data.amount !== undefined && data.amount !== Number(existing.amount)) {
    await logActivity({
      userId,
      action: "PRICE_CHANGED",
      entityType: "CustomerService",
      entityId: updated.id,
      previousValue: { amount: existing.amount },
      newValue: { amount: updated.amount },
    });
  }
  if (data.paymentStatus && data.paymentStatus !== existing.paymentStatus) {
    await logActivity({
      userId,
      action: "PAYMENT_STATUS_CHANGED",
      entityType: "CustomerService",
      entityId: updated.id,
      previousValue: { paymentStatus: existing.paymentStatus, amountReceived: existing.amountReceived },
      newValue: { paymentStatus: updated.paymentStatus, amountReceived: updated.amountReceived },
    });
  }

  return NextResponse.json({ customerService: updated });
}
