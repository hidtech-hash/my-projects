import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageAgents } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextAgentCode } from "@/lib/codes";
import { logActivity } from "@/lib/activityLog";
import bcrypt from "bcryptjs";
import { z } from "zod";

// GET /api/agents?search=raj
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";

  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { mobile: { contains: search } },
            { agentCode: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const agents = await prisma.agent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { customerServices: true } },
      user: { select: { email: true, isActive: true } },
    },
  });

  return NextResponse.json({ agents });
}

const createAgentSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().min(10).max(15),
  altMobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
  // Optional: create a portal login for this agent at the same time.
  createLogin: z.boolean().optional(),
  loginId: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
});

// POST /api/agents
// No commission fields — agents simply get the fixed "agent price"
// defined per service (see /api/services). Optionally also creates
// a portal login (role=AGENT) linked 1:1 to this agent record.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageAgents(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const userId = (session.user as any).id as string;

  if (data.createLogin) {
    if (!data.loginId || !data.password) {
      return NextResponse.json(
        { error: "loginId and password are required to create a login" },
        { status: 400 }
      );
    }
    const existingUser = await prisma.user.findUnique({ where: { email: data.loginId } });
    if (existingUser) {
      return NextResponse.json({ error: "That login ID is already in use" }, { status: 409 });
    }
  }

  const agentCode = await nextAgentCode();

  const agent = await prisma.$transaction(async (tx) => {
    let newUserId: string | undefined;
    if (data.createLogin && data.loginId && data.password) {
      const passwordHash = await bcrypt.hash(data.password, 10);
      const newUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.loginId,
          passwordHash,
          role: "AGENT",
        },
      });
      newUserId = newUser.id;
    }

    return tx.agent.create({
      data: {
        agentCode,
        name: data.name,
        mobile: data.mobile,
        altMobile: data.altMobile || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        notes: data.notes || null,
        createdById: userId,
        userId: newUserId,
      },
    });
  });

  await logActivity({
    userId,
    action: "AGENT_CREATED",
    entityType: "Agent",
    entityId: agent.id,
    newValue: { agentCode: agent.agentCode, name: agent.name, loginCreated: !!data.createLogin },
  });

  return NextResponse.json({ agent }, { status: 201 });
}
