import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageAgents, canManageAgentUsers } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import bcrypt from "bcryptjs";
import { z } from "zod";

// GET /api/agents/:id
// Returns the agent profile, every customer-service they referred
// (each already priced at the service's fixed agent rate), a
// payment summary (how much work this agent brought us, how much
// we've collected, how much is still pending), their login info (if
// any), and their payment-request history.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.agent.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, email: true, isActive: true } },
      customerServices: {
        where: { deletedAt: null },
        orderBy: { appliedDate: "desc" },
        include: {
          service: true,
          customer: { select: { id: true, fullName: true, customerCode: true, mobile: true } },
          assignedEmployee: { select: { name: true } },
        },
      },
      paymentRequests: {
        orderBy: { createdAt: "desc" },
        include: {
          verifiedBy: { select: { name: true } },
        },
      },
    },
  });

  if (!agent || agent.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let totalBusiness = 0;
  let totalReceived = 0;
  const byStatus: Record<string, number> = {};
  const byService: Record<string, { count: number; total: number; pending: number }> = {};

  for (const cs of agent.customerServices) {
    const amount = Number(cs.amount ?? 0);
    const received = Number(cs.amountReceived ?? 0);
    totalBusiness += amount;
    totalReceived += received;
    byStatus[cs.status] = (byStatus[cs.status] ?? 0) + 1;

    const key = cs.service.name;
    if (!byService[key]) byService[key] = { count: 0, total: 0, pending: 0 };
    byService[key].count += 1;
    byService[key].total += amount;
    byService[key].pending += amount - received;
  }

  return NextResponse.json({
    agent,
    summary: {
      totalReferred: agent.customerServices.length,
      totalBusiness,
      totalReceived,
      totalPending: totalBusiness - totalReceived,
      byStatus,
      byService,
    },
  });
}

const updateAgentSchema = z.object({
  name: z.string().min(2).optional(),
  mobile: z.string().min(10).max(15).optional(),
  altMobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  // Login management (only meaningful together with canManageAgentUsers)
  createLogin: z.boolean().optional(),
  loginId: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  loginIsActive: z.boolean().optional(),
});

// PUT /api/agents/:id
// Edit agent info, activate/deactivate the agent record, and manage
// their login: create one if they don't have it yet, reset the
// password, or enable/disable it. Deactivating the Agent also
// deactivates the linked login (an inactive agent shouldn't be able
// to sign in), and vice versa is independently controllable too.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageAgents(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = (session.user as any).id as string;

  const existing = await prisma.agent.findUnique({ where: { id: params.id } });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Login management is a distinct permission conceptually, even
  // though it currently maps to the same roles as canManageAgents.
  const touchingLogin =
    data.createLogin || data.password !== undefined || data.loginIsActive !== undefined;
  if (touchingLogin && !canManageAgentUsers(role)) {
    return NextResponse.json({ error: "Forbidden: cannot manage agent login" }, { status: 403 });
  }

  let newUserId: string | undefined;

  try {
    await prisma.$transaction(async (tx) => {
      // Create a login for an agent who doesn't have one yet.
      if (data.createLogin && !existing.userId) {
        if (!data.loginId || !data.password) {
          throw new Error("loginId and password are required to create a login");
        }
        const clash = await tx.user.findUnique({ where: { email: data.loginId } });
        if (clash) throw new Error("That login ID is already in use");

        const passwordHash = await bcrypt.hash(data.password, 10);
        const newUser = await tx.user.create({
          data: { name: data.name ?? existing.name, email: data.loginId, passwordHash, role: "AGENT" },
        });
        newUserId = newUser.id;
      }

      // Reset password on an existing login.
      if (existing.userId && data.password) {
        const passwordHash = await bcrypt.hash(data.password, 10);
        await tx.user.update({ where: { id: existing.userId }, data: { passwordHash } });
      }

      // Enable/disable the existing login directly, or implicitly via
      // agent status below.
      if (existing.userId && data.loginIsActive !== undefined) {
        await tx.user.update({ where: { id: existing.userId }, data: { isActive: data.loginIsActive } });
      }
      if (existing.userId && data.status) {
        await tx.user.update({
          where: { id: existing.userId },
          data: { isActive: data.status === "ACTIVE" },
        });
      }

      await tx.agent.update({
        where: { id: params.id },
        data: {
          name: data.name ?? undefined,
          mobile: data.mobile ?? undefined,
          altMobile: data.altMobile ?? undefined,
          email: data.email ?? undefined,
          address: data.address ?? undefined,
          city: data.city ?? undefined,
          state: data.state ?? undefined,
          notes: data.notes ?? undefined,
          status: data.status ?? undefined,
          userId: newUserId ?? undefined,
        },
      });
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Could not update agent" }, { status: 400 });
  }

  if (data.status && data.status !== existing.status) {
    await logActivity({
      userId,
      action: "AGENT_STATUS_CHANGED",
      entityType: "Agent",
      entityId: params.id,
      previousValue: { status: existing.status },
      newValue: { status: data.status },
    });
  }
  if (data.createLogin) {
    await logActivity({
      userId,
      action: "AGENT_LOGIN_CREATED",
      entityType: "Agent",
      entityId: params.id,
      newValue: { loginId: data.loginId },
    });
  }
  if (data.password && existing.userId) {
    await logActivity({
      userId,
      action: "AGENT_PASSWORD_RESET",
      entityType: "Agent",
      entityId: params.id,
    });
  }

  const updated = await prisma.agent.findUnique({
    where: { id: params.id },
    include: { user: { select: { email: true, isActive: true } } },
  });

  return NextResponse.json({ agent: updated });
}
