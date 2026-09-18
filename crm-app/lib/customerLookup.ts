import { prisma } from "./prisma";

// Shared "does a customer with this mobile number already exist"
// check, used by both the staff Add Customer flow and the Agent
// Apply for Service flow — one place, two thin route wrappers (kept
// separate so the AGENT-only middleware boundary stays simple: an
// agent can only ever reach /api/agent-portal/*).
export async function findCustomerByMobile(mobile: string) {
  return prisma.customer.findFirst({
    where: { mobile, deletedAt: null },
    select: {
      id: true,
      customerCode: true,
      fullName: true,
      mobile: true,
      email: true,
      district: true,
      state: true,
    },
  });
}
