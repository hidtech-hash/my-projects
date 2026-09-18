import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAgentRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentForUser, getAgentBalance } from "@/lib/agentContext";
import { ServiceStatus } from "@prisma/client";

// GET /api/agent-portal/dashboard?search=
// AGENT role only. Returns ONLY this agent's own applications and
// totals — resolved from the session's user id, never from a
// client-supplied agent id, so one agent can never fetch another
// agent's data by guessing an id. `search` matches customer name,
// mobile, work code / reference number, service name, or status —
// scoped to this agent's applications only (never a global search).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAgentRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as any).id as string;
  const agent = await getAgentForUser(userId);
  if (!agent) {
    return NextResponse.json({ error: "No agent profile is linked to this login" }, { status: 404 });
  }

  const search = new URL(req.url).searchParams.get("search")?.trim();

  // Only add a status-equals clause when the search term is ACTUALLY
  // a valid status value (e.g. "rejected", "pending review") — the
  // `status` column is a typed enum, so passing anything else through
  // Prisma's `equals` (a customer name, a mobile number, a service
  // name — i.e. almost every real search) throws a validation error
  // at query time and the whole search silently fails. This was the
  // root cause of search "not working" at all.
  const asStatus = search?.toUpperCase().replace(/ /g, "_");
  const matchesAStatus = !!asStatus && (Object.values(ServiceStatus) as string[]).includes(asStatus);

  const applications = await prisma.customerService.findMany({
    where: {
      agentId: agent.id,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { workCode: { contains: search, mode: "insensitive" as const } },
              { referenceNumber: { contains: search, mode: "insensitive" as const } },
              ...(matchesAStatus ? [{ status: { equals: asStatus as ServiceStatus } }] : []),
              { customer: { fullName: { contains: search, mode: "insensitive" as const } } },
              { customer: { mobile: { contains: search } } },
              { service: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    orderBy: { appliedDate: "desc" },
    include: {
      service: { select: { name: true } },
      customer: { select: { fullName: true, customerCode: true, mobile: true } },
    },
  });

  // Balance totals use the shared calculation (excludes PENDING_REVIEW
  // / REJECTED / CANCELLED) even though the table above lists every
  // application regardless of status, so the agent can still see and
  // act on pending-review/rejected items.
  const balance = await getAgentBalance(agent.id);

  return NextResponse.json({
    agent: { id: agent.id, name: agent.name, agentCode: agent.agentCode, enterpriseName: agent.enterpriseName },
    applications,
    summary: {
      totalApplications: applications.length,
      totalAmount: balance.total,
      totalReceived: balance.received,
      totalPending: balance.pending,
    },
  });
}
