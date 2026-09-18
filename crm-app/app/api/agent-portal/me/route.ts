import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAgentRole } from "@/lib/auth";
import { getAgentForUser } from "@/lib/agentContext";

// GET /api/agent-portal/me
// Lightweight profile lookup used by AgentNav on every agent-portal
// page — returns just enough (name, agentCode, enterpriseName) to
// render the navbar without every page having to separately fetch
// the full dashboard payload.
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAgentRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as any).id as string;
  const agent = await getAgentForUser(userId);
  if (!agent) return NextResponse.json({ error: "No agent profile is linked to this login" }, { status: 404 });

  return NextResponse.json({
    agent: { name: agent.name, agentCode: agent.agentCode, enterpriseName: agent.enterpriseName },
  });
}
