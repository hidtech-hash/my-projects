import { prisma } from "./prisma";

// Application statuses that must NOT count toward an agent's
// pending balance. This is the entire implementation of "payment
// must not be added until an employee accepts the application":
// PENDING_REVIEW (submitted, not yet reviewed), REJECTED, and
// CANCELLED are excluded from every balance calculation below. The
// moment staff move an application's status away from
// PENDING_REVIEW/REJECTED (e.g. to ACCEPTED), the very next balance
// query picks it up automatically — there is no separate "add to
// balance" mutation to remember to call.
export const EXCLUDED_FROM_BALANCE = ["PENDING_REVIEW", "REJECTED", "CANCELLED"] as const;

// Resolves the Agent record linked to a logged-in AGENT-role user.
// Returns null if this user has no linked agent (shouldn't normally
// happen for role=AGENT, but handled defensively) or the agent is
// inactive/deleted.
export async function getAgentForUser(userId: string) {
  const agent = await prisma.agent.findUnique({
    where: { userId },
  });
  if (!agent || agent.deletedAt) return null;
  return agent;
}

// The single source of truth for an agent's balance. Reused by the
// admin agent-profile API, the agent-portal dashboard, and the QR
// endpoint so all three always agree. Only counts applications that
// have actually been accepted into the normal workflow — see
// EXCLUDED_FROM_BALANCE above.
export async function getAgentBalance(agentId: string) {
  const items = await prisma.customerService.findMany({
    where: { agentId, deletedAt: null, status: { notIn: EXCLUDED_FROM_BALANCE as any } },
    select: { amount: true, amountReceived: true },
  });

  let total = 0;
  let received = 0;
  for (const cs of items) {
    total += Number(cs.amount ?? 0);
    received += Number(cs.amountReceived ?? 0);
  }
  return { total, received, pending: Math.max(0, total - received) };
}

// Applies a verified agent payment across that agent's outstanding
// (not-yet-fully-paid, balance-eligible) applications, oldest first,
// filling each up to its full price before moving to the next. This
// is what keeps the agent-level "received/pending" totals and each
// individual application's amountReceived/paymentStatus in
// agreement — there is only one source of truth (CustomerService
// rows); the payment request table is the audit trail of *why* they
// changed. PENDING_REVIEW/REJECTED/CANCELLED applications are never
// touched by an allocation, consistent with them not counting toward
// the balance in the first place.
export async function allocatePaymentToAgentWork(agentId: string, verifiedAmount: number) {
  const items = await prisma.customerService.findMany({
    where: {
      agentId,
      deletedAt: null,
      paymentStatus: { not: "PAID" },
      status: { notIn: EXCLUDED_FROM_BALANCE as any },
    },
    orderBy: { appliedDate: "asc" },
  });

  let remaining = verifiedAmount;
  for (const cs of items) {
    if (remaining <= 0) break;
    const amount = Number(cs.amount ?? 0);
    const alreadyReceived = Number(cs.amountReceived ?? 0);
    const owedOnThis = amount - alreadyReceived;
    if (owedOnThis <= 0) continue;

    const toApply = Math.min(owedOnThis, remaining);
    const newReceived = alreadyReceived + toApply;
    remaining -= toApply;

    await prisma.customerService.update({
      where: { id: cs.id },
      data: {
        amountReceived: newReceived,
        paymentStatus: newReceived >= amount ? "PAID" : "PARTIAL",
      },
    });
  }
  // Any leftover `remaining` (agent overpaid beyond all current dues)
  // is intentionally not applied anywhere — it simply shows as the
  // agent having ₹0 pending until new work is accepted. Nothing is
  // lost: it's still visible in the AgentPaymentRequest audit trail.
}

// The oldest `acceptedAt` among an agent's currently-outstanding
// (balance-eligible, not fully paid) applications — i.e. "since when
// has this agent owed us money". Returns null if the agent has no
// outstanding balance (shown as "No Due", not "0 days").
export async function getAgentPendingSince(agentId: string): Promise<Date | null> {
  const oldest = await prisma.customerService.findFirst({
    where: {
      agentId,
      deletedAt: null,
      status: { notIn: EXCLUDED_FROM_BALANCE as any },
      paymentStatus: { not: "PAID" },
      acceptedAt: { not: null },
    },
    orderBy: { acceptedAt: "asc" },
    select: { acceptedAt: true },
  });
  return oldest?.acceptedAt ?? null;
}

// Balance + "pending since" for every active agent in one pass —
// used by the Agents list (Pending Payment / Payment Pending From
// columns) so we don't run N separate queries for N agents.
export async function getAllAgentsBalances() {
  const items = await prisma.customerService.findMany({
    where: {
      agentId: { not: null },
      deletedAt: null,
      status: { notIn: EXCLUDED_FROM_BALANCE as any },
    },
    select: { agentId: true, amount: true, amountReceived: true, paymentStatus: true, acceptedAt: true },
  });

  const byAgent: Record<string, { total: number; received: number; oldestUnpaidAcceptedAt: Date | null }> = {};
  for (const it of items) {
    const key = it.agentId as string;
    if (!byAgent[key]) byAgent[key] = { total: 0, received: 0, oldestUnpaidAcceptedAt: null };
    byAgent[key].total += Number(it.amount ?? 0);
    byAgent[key].received += Number(it.amountReceived ?? 0);
    if (it.paymentStatus !== "PAID" && it.acceptedAt) {
      const current = byAgent[key].oldestUnpaidAcceptedAt;
      if (!current || it.acceptedAt < current) byAgent[key].oldestUnpaidAcceptedAt = it.acceptedAt;
    }
  }
  return byAgent;
}

// Org-wide agent payment summary for the Agent Management dashboard
// cards. Entirely derived from the ledger (CustomerService rows +
// approved AgentPaymentRequest rows) — nothing here is hard-coded or
// computed from anything the frontend sends.
export async function getAgentsSummary() {
  const agents = await prisma.agent.findMany({ where: { deletedAt: null }, select: { id: true } });
  const balances = await getAllAgentsBalances();

  let totalPendingPayment = 0;
  let agentsWithPendingPayment = 0;
  for (const a of agents) {
    const b = balances[a.id];
    const pending = b ? Math.max(0, b.total - b.received) : 0;
    totalPendingPayment += pending;
    if (pending > 0) agentsWithPendingPayment++;
  }

  const totalServicesReferred = await prisma.customerService.count({
    where: { agentId: { not: null }, deletedAt: null },
  });

  // "Paid" per the spec means verified/approved payments only — the
  // AgentPaymentRequest table is the authoritative record of that,
  // distinct from amountReceived (which staff can also adjust
  // directly for edge cases, e.g. "Mark Fully Paid").
  const approvedAgg = await prisma.agentPaymentRequest.aggregate({
    where: { status: "APPROVED" },
    _sum: { verifiedAmount: true },
  });

  return {
    totalAgents: agents.length,
    totalPendingPayment,
    totalServicesReferred,
    totalPaidPayment: Number(approvedAgg._sum.verifiedAmount ?? 0),
    agentsWithPendingPayment,
    agentsWithNoDue: agents.length - agentsWithPendingPayment,
  };
}
