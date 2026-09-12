import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canVerifyPayments } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/payment-requests?agentId=&status=
// Admin/Manager only. The full payment-request queue, filterable by
// agent and/or status, newest first.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canVerifyPayments(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId") || undefined;
  const status = searchParams.get("status") || undefined;

  const requests = await prisma.agentPaymentRequest.findMany({
    where: {
      agentId: agentId || undefined,
      status: (status as any) || undefined,
    },
    orderBy: { createdAt: "desc" },
    include: {
      agent: { select: { id: true, name: true, agentCode: true } },
      submittedBy: { select: { name: true } },
      verifiedBy: { select: { name: true } },
    },
  });

  const totals = {
    pendingCount: requests.filter((r) => r.status === "PENDING_VERIFICATION").length,
    totalApproved: requests
      .filter((r) => r.status === "APPROVED")
      .reduce((sum, r) => sum + Number(r.verifiedAmount ?? 0), 0),
  };

  return NextResponse.json({ requests, totals });
}
