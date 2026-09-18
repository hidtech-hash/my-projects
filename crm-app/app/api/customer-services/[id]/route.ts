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
import { EXCLUDED_FROM_BALANCE } from "@/lib/agentContext";
import { z } from "zod";
import { ServiceStatus, PaymentStatus } from "@prisma/client";

const updateSchema = z.object({
  status: z.nativeEnum(ServiceStatus).optional(),
  referenceNumber: z.string().optional(),
  rejectionReason: z.string().optional(),
  notes: z.string().optional(),
  completedDate: z.string().optional(),
  agentId: z.string().nullable().optional(),
  assignedEmployeeId: z.string().nullable().optional(),
  // Price and payment figures — admin/manager only (see below).
  amount: z.number().optional(),
  amountReceived: z.number().optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
});

// GET /api/customer-services/:id
// Full "review this application" detail for staff — customer,
// service (with its dynamic field/document configuration), agent,
// submitted field values, uploaded documents, and recent activity.
// This is what the Accept/Reject review screen reads.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const application = await prisma.customerService.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      agent: { select: { id: true, name: true, agentCode: true } },
      assignedEmployee: { select: { id: true, name: true } },
      service: {
        include: {
          fields: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
          documentRequirements: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
        },
      },
      fieldValues: true,
      documents: { orderBy: { uploadedAt: "asc" } },
    },
  });
  if (!application || application.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const activity = await prisma.activityLog.findMany({
    where: { entityType: "CustomerService", entityId: application.id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({ application, activity });
}


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

  // Reassigning WHO does the work is restricted to admin/manager —
  // but only when it's an ACTUAL reassignment. Two things are always
  // allowed regardless of role: resending the application's current
  // (unchanged) assignment, and claiming/self-assigning it. Without
  // this distinction, simply re-saving a form that happens to carry
  // the existing assignedEmployeeId value (e.g. entering a reference
  // number on an application nobody has claimed yet) was being
  // rejected as if it were a reassignment attempt.
  //
  // Accepting a previously-unassigned application (typical for an
  // agent-submitted one, which nothing auto-assigns at submission
  // time) defaults it to whoever is accepting it, the same way an
  // employee's own customer intake auto-assigns to themselves — so
  // it actually shows up as their work afterward instead of vanishing
  // into an unowned limbo.
  let effectiveAssignedEmployeeId = data.assignedEmployeeId;
  if (
    data.status === "ACCEPTED" &&
    !existing.assignedEmployeeId &&
    effectiveAssignedEmployeeId === undefined
  ) {
    effectiveAssignedEmployeeId = userId;
  }

  if (
    effectiveAssignedEmployeeId !== undefined &&
    effectiveAssignedEmployeeId !== existing.assignedEmployeeId &&
    effectiveAssignedEmployeeId !== userId &&
    !canAssignWork(role)
  ) {
    return NextResponse.json({ error: "Forbidden: cannot reassign work" }, { status: 403 });
  }

  const isTouchingMoney =
    data.amount !== undefined || data.amountReceived !== undefined || data.paymentStatus !== undefined;
  if (isTouchingMoney && !canManagePayments(role)) {
    return NextResponse.json({ error: "Forbidden: cannot edit price/payment" }, { status: 403 });
  }

  // Rejecting an application without a reason leaves the agent with
  // nothing to act on — required per the resubmit workflow.
  if (data.status === "REJECTED" && !data.rejectionReason && !existing.rejectionReason) {
    return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  }
  // Moving away from REJECTED (accepted, resubmitted, etc.) clears
  // the old reason so it doesn't linger and confuse the next review.
  const clearingRejectionReason = data.status && data.status !== "REJECTED" && existing.status === "REJECTED";

  // The moment this application first becomes balance-eligible (see
  // lib/agentContext.ts), stamp acceptedAt — this is what "days
  // pending" is measured from on the Agents list. Only ever set
  // once; never overwritten on later status changes.
  const becomingBalanceEligible =
    data.status !== undefined &&
    !EXCLUDED_FROM_BALANCE.includes(data.status as any) &&
    !existing.acceptedAt;

  const updated = await prisma.customerService.update({
    where: { id: params.id },
    data: {
      status: data.status ?? undefined,
      referenceNumber: data.referenceNumber ?? undefined,
      rejectionReason: data.status === "REJECTED" ? data.rejectionReason ?? existing.rejectionReason : clearingRejectionReason ? null : undefined,
      notes: data.notes ?? undefined,
      completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
      agentId: data.agentId,
      assignedEmployeeId: effectiveAssignedEmployeeId,
      acceptedAt: becomingBalanceEligible ? new Date() : undefined,
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
      action:
        data.status === "ACCEPTED"
          ? "APPLICATION_ACCEPTED"
          : data.status === "REJECTED"
          ? "APPLICATION_REJECTED"
          : "SERVICE_STATUS_CHANGED",
      entityType: "CustomerService",
      entityId: updated.id,
      previousValue: { status: existing.status },
      newValue: { status: updated.status, rejectionReason: data.status === "REJECTED" ? updated.rejectionReason : undefined },
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
  if (effectiveAssignedEmployeeId !== undefined && effectiveAssignedEmployeeId !== existing.assignedEmployeeId) {
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
