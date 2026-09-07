import { prisma } from "./prisma";

// Generates the next sequential code for a prefix, e.g. CUS-000001.
// Uses a simple count+1 approach for Phase 1. If two requests race,
// the unique constraint on customerCode/workCode will reject a
// duplicate and the caller can retry — acceptable at this volume.
// (Swap for a dedicated counters table if write volume grows.)

export async function nextCustomerCode(): Promise<string> {
  const count = await prisma.customer.count();
  return `CUS-${String(count + 1).padStart(6, "0")}`;
}

export async function nextWorkCode(): Promise<string> {
  const count = await prisma.customerService.count();
  return `WRK-${String(count + 1).padStart(6, "0")}`;
}
