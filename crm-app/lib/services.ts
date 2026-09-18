import { prisma } from "./prisma";

// Single source of truth for "which services can be applied to" and
// "what does this service's dynamic config look like" — used by both
// the staff-facing routes (/api/services*) and the agent-portal
// routes (/api/agent-portal/services*). There is exactly one Service
// model and one query for each of these; the two route files are
// thin wrappers so agents stay inside the AGENT middleware allowlist
// without a second service list ever existing.

export async function listActiveServices() {
  return prisma.service.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function listAllServices() {
  return prisma.service.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getServiceWithConfig(id: string) {
  return prisma.service.findUnique({
    where: { id },
    include: {
      fields: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      documentRequirements: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });
}
