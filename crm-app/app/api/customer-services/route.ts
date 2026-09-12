import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canAssignWork, canManagePayments } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextWorkCode } from "@/lib/codes";
import { logActivity } from "@/lib/activityLog";
import { z } from "zod";

const applySchema = z.object({
  customerId: z.string(),
  serviceId: z.string(),
  agentId: z.string().optional(),
  assignedEmployeeId: z.string().optional(),
  // Optional manual override of the price — normally the system
  // auto-fills this from the service's customerPrice/agentPrice.
  amount: z.number().optional(),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
});

// POST /api/customer-services
// "Customer applied for a service" — the core action. Creates a
// new work record under the existing customer (never a new
// customer). No commission math: the price is either the service's
// fixed customer price or its fixed agent price, chosen automatically
// based on whether an agent is linked.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Server-side permission enforcement (never trust the frontend hiding a
  // field — someone could still call this API directly):
  // - Anyone who can apply a service can record which agent brought the
  //   work — this is just data entry now, no financial figure to set,
  //   since the price comes automatically from the service's fixed rates.
  // - Only admin/manager may assign the work to someone OTHER than
  //   themselves. Anyone is allowed to leave it unassigned, which then
  //   defaults to themselves (if they're an employee) below.
  // - Only admin/manager may override the auto-calculated price.
  if (data.assignedEmployeeId && data.assignedEmployeeId !== userId && !canAssignWork(role)) {
    return NextResponse.json({ error: "Forbidden: cannot assign to another employee" }, { status: 403 });
  }
  if (data.amount !== undefined && !canManagePayments(role)) {
    return NextResponse.json({ error: "Forbidden: cannot override price" }, { status: 403 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer || customer.deletedAt) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
  if (!service || !service.isActive) {
    return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
  }

  // Auto-pick the fixed price: agent price if this work came through an
  // agent, otherwise the normal customer price. Admin/Manager can still
  // pass an explicit `amount` to override (e.g. a one-off discount).
  const autoAmount = data.agentId ? service.agentPrice : service.customerPrice;
  const amount = data.amount !== undefined ? data.amount : autoAmount;

  const workCode = await nextWorkCode();

  // If nobody explicitly assigned this work, default it to whoever is
  // intaking it (if they're an employee) so it shows up on their own
  // dashboard as work they need to follow up on. Admin/Manager intake
  // stays unassigned by default — it sits in the shared queue until
  // deliberately assigned.
  const assignedEmployeeId =
    data.assignedEmployeeId || (role === "EMPLOYEE" ? userId : null);

  const record = await prisma.customerService.create({
    data: {
      workCode,
      customerId: data.customerId,
      serviceId: data.serviceId,
      agentId: data.agentId || null,
      assignedEmployeeId,
      status: assignedEmployeeId ? "ASSIGNED" : "NEW",
      amount,
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
      notes: data.notes || null,
      createdById: userId,
    },
    include: { service: true, agent: true },
  });

  if (record.agentId) {
    await logActivity({
      userId,
      action: "SERVICE_LINKED_TO_AGENT",
      entityType: "CustomerService",
      entityId: record.id,
      newValue: { agentId: record.agentId, agentName: record.agent?.name, agentPrice: amount },
    });
  }
  if (record.assignedEmployeeId) {
    await logActivity({
      userId,
      action: "SERVICE_ASSIGNED",
      entityType: "CustomerService",
      entityId: record.id,
      newValue: { assignedEmployeeId: record.assignedEmployeeId },
    });
  }

  await logActivity({
    userId,
    action: "SERVICE_APPLIED",
    entityType: "CustomerService",
    entityId: record.id,
    newValue: { workCode: record.workCode, service: record.service.name, status: record.status, amount },
  });

  return NextResponse.json({ customerService: record }, { status: 201 });
}
