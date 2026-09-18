import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageServices } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServiceWithConfig } from "@/lib/services";
import { z } from "zod";

// GET /api/services/:id
// Returns the service plus its full dynamic configuration — fields
// and document requirements, in display order. This is what the
// Service Configuration page (and, indirectly, the agent's Apply
// for Service form) reads to render everything generically.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await getServiceWithConfig(params.id);
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ service });
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  customerPrice: z.number().min(0).optional(),
  agentPrice: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/services/:id
// Admin/Manager only. Edit a service's name/prices, or
// activate/deactivate it. Existing CustomerService records keep
// whatever `amount` they were created with — this only changes the
// price used for future applications of the service.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageServices(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = await prisma.service.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ service });
}
