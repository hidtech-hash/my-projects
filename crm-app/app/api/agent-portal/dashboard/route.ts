import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAgentRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentForUser } from "@/lib/agentContext";

// GET /api/agent-portal/dashboard
// AGENT role only. Returns ONLY this agent's own applications and
// totals — resolved from the session's user id, never from a
// client-supplied agent id, so one agent can never fetch another
// agent's data by guessing an id.
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAgentRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as any).id as string;
  const agent = await getAgentForUser(userId);
  if (!agent) {
    return NextResponse.json({ error: "No agent profile is linked to this login" }, { status: 404 });
  }

  const applications = await prisma.customerService.findMany({
    where: { agentId: agent.id, deletedAt: null },
    orderBy: { appliedDate: "desc" },
    include: {
      service: { select: { name: true } },
      customer: { select: { fullName: true, customerCode: true, mobile: true } },
    },
  });

  let totalAmount = 0;
  let totalReceived = 0;
  for (const a of applications) {
    totalAmount += Number(a.amount ?? 0);
    totalReceived += Number(a.amountReceived ?? 0);
  }

  return NextResponse.json({
    agent: { id: agent.id, name: agent.name, agentCode: agent.agentCode },
    applications,
    summary: {
      totalApplications: applications.length,
      totalAmount,
      totalReceived,
      totalPending: Math.max(0, totalAmount - totalReceived),
    },
  });
}
