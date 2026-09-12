import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageServices } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET /api/services
// By default returns only active services (used to populate the
// "apply service" dropdown). Pass ?all=1 to include inactive ones too
// (used by the Admin/Manager service-management screen).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const includeAll = searchParams.get("all") === "1";

  const services = await prisma.service.findMany({
    where: includeAll ? {} : { isActive: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ services });
}

const createServiceSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  description: z.string().optional(),
  customerPrice: z.number().min(0),
  agentPrice: z.number().min(0),
});

// POST /api/services
// Admin/Manager only. Creates a service with its two fixed prices —
// what a normal customer pays, and the fixed discounted rate for
// work that comes through any agent. No commission math anywhere;
// agentPrice IS the price.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageServices(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const service = await prisma.service.create({
    data: {
      name: data.name,
      code: data.code.toUpperCase().replace(/\s+/g, "_"),
      description: data.description || null,
      customerPrice: data.customerPrice,
      agentPrice: data.agentPrice,
    },
  });

  return NextResponse.json({ service }, { status: 201 });
}
