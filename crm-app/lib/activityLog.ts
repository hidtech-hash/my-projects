import { prisma } from "./prisma";

export async function logActivity(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
}) {
  await prisma.activityLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      previousValue: params.previousValue as any,
      newValue: params.newValue as any,
    },
  });
}
