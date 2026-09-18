import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAgentRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentForUser } from "@/lib/agentContext";
import { logActivity } from "@/lib/activityLog";

// PUT /api/agent-portal/applications/:id/cancel
// The Agent gives up on a REJECTED application instead of
// correcting it. Stays in history as CANCELLED; never counted
// toward the agent's balance (see lib/agentContext.ts).
export async function PUT(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAgentRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = (session.user as any).id as string;

  const agent = await getAgentForUser(userId);
  if (!agent) return NextResponse.json({ error: "No agent profile is linked to this login" }, { status: 404 });

  const application = await prisma.customerService.findFirst({
    where: { id: params.id, agentId: agent.id, deletedAt: null },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (application.status !== "REJECTED") {
    return NextResponse.json({ error: "Only a rejected application can be cancelled" }, { status: 409 });
  }

  const updated = await prisma.customerService.update({
    where: { id: application.id },
    data: { status: "CANCELLED", updatedById: userId },
  });

  await logActivity({
    userId,
    action: "AGENT_APPLICATION_CANCELLED",
    entityType: "CustomerService",
    entityId: application.id,
    previousValue: { status: "REJECTED" },
    newValue: { status: "CANCELLED" },
  });

  return NextResponse.json({ application: updated });
}
