import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TERMINAL_STATUSES = ["COMPLETED", "REJECTED", "CANCELLED"];

// GET /api/dashboard/my-work
// Returns the logged-in user's assigned applications, split into:
// - pending: not yet in a terminal status
// - needsReference: not terminal AND no reference number entered yet
//   (i.e. the online application hasn't been fully submitted/tracked)
// For Admin/Manager, also returns an org-wide "unassigned" queue since
// their own "assigned to me" list is usually empty by design.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as string;

  const assigned = await prisma.customerService.findMany({
    where: { assignedEmployeeId: userId, deletedAt: null },
    orderBy: { appliedDate: "asc" },
    include: {
      service: true,
      customer: { select: { id: true, fullName: true, customerCode: true, mobile: true } },
      agent: { select: { name: true } },
    },
  });

  const pending = assigned.filter((cs) => !TERMINAL_STATUSES.includes(cs.status));
  const needsReference = pending.filter((cs) => !cs.referenceNumber);

  let unassigned: typeof assigned = [];
  if (role === "ADMIN" || role === "MANAGER") {
    unassigned = await prisma.customerService.findMany({
      where: { assignedEmployeeId: null, deletedAt: null, status: { notIn: TERMINAL_STATUSES as any } },
      orderBy: { appliedDate: "asc" },
      include: {
        service: true,
        customer: { select: { id: true, fullName: true, customerCode: true, mobile: true } },
        agent: { select: { name: true } },
      },
    });
  }

  return NextResponse.json({
    pending,
    needsReference,
    unassigned,
    counts: {
      totalAssigned: assigned.length,
      pending: pending.length,
      needsReference: needsReference.length,
      unassigned: unassigned.length,
    },
  });
}
