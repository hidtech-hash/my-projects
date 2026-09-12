import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/customers/:id
// Returns the customer profile with every service they've
// applied for (their full service history) and recent activity.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      services: {
        where: { deletedAt: null },
        orderBy: { appliedDate: "desc" },
        include: { service: true, agent: true, assignedEmployee: { select: { id: true, name: true } } },
      },
      createdBy: { select: { name: true } },
    },
  });

  if (!customer || customer.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const activity = await prisma.activityLog.findMany({
    where: {
      OR: [
        { entityType: "Customer", entityId: customer.id },
        { entityType: "CustomerService", entityId: { in: customer.services.map((s) => s.id) } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({ customer, activity });
}
