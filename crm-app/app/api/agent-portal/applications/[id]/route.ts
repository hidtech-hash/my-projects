import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAgentRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentForUser } from "@/lib/agentContext";

// GET /api/agent-portal/applications/:id
// An agent's own application in full detail — customer, service,
// dynamic field values, documents. Scoped to `agentId: agent.id` in
// the query itself, so requesting another agent's application id
// returns 404, not someone else's data — an agent can never reach
// another agent's application by guessing/manipulating an id.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAgentRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as any).id as string;
  const agent = await getAgentForUser(userId);
  if (!agent) return NextResponse.json({ error: "No agent profile is linked to this login" }, { status: 404 });

  const application = await prisma.customerService.findFirst({
    where: { id: params.id, agentId: agent.id, deletedAt: null },
    include: {
      customer: true,
      service: {
        include: {
          fields: { where: { isActive: true, visibleToAgent: true }, orderBy: { sortOrder: "asc" } },
          documentRequirements: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
        },
      },
      fieldValues: true,
      documents: true,
    },
  });

  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ application });
}
