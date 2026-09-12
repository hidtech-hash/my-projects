import { prisma } from "./prisma";

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
// endpoint so all three always agree.
export async function getAgentBalance(agentId: string) {
  const items = await prisma.customerService.findMany({
    where: { agentId, deletedAt: null },
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
// (not-yet-fully-paid) applications, oldest first, filling each up
// to its full price before moving to the next. This is what keeps
// the agent-level "received/pending" totals and each individual
// application's amountReceived/paymentStatus in agreement — there is
// only one source of truth (CustomerService rows); the payment
// request table is the audit trail of *why* they changed.
export async function allocatePaymentToAgentWork(agentId: string, verifiedAmount: number) {
  const items = await prisma.customerService.findMany({
    where: { agentId, deletedAt: null, paymentStatus: { not: "PAID" } },
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
  // agent having ₹0 pending until new work is applied. Nothing is lost:
  // it's still visible in the AgentPaymentRequest audit trail.
}
