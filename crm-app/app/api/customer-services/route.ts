import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextWorkCode } from "@/lib/codes";
import { logActivity } from "@/lib/activityLog";
import { z } from "zod";

const applySchema = z.object({
  customerId: z.string(),
  serviceId: z.string(),
  amount: z.number().optional(),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
});

// POST /api/customer-services
// "Customer applied for a service" — the core action. Creates a
// new work record under the existing customer (never a new
// customer). Status starts at NEW.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer || customer.deletedAt) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const workCode = await nextWorkCode();

  const record = await prisma.customerService.create({
    data: {
      workCode,
      customerId: data.customerId,
      serviceId: data.serviceId,
      amount: data.amount,
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
      notes: data.notes || null,
      createdById: userId,
    },
    include: { service: true },
  });

  await logActivity({
    userId,
    action: "SERVICE_APPLIED",
    entityType: "CustomerService",
    entityId: record.id,
    newValue: { workCode: record.workCode, service: record.service.name, status: record.status },
  });

  return NextResponse.json({ customerService: record }, { status: 201 });
}
