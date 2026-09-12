import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canConfigureUpi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET /api/upi-config
// Returns the currently active UPI configuration (or null if none
// has ever been set). Any logged-in user can read this — agents
// need it indirectly (via the QR endpoint, not this one directly),
// and admin/manager need it to display/edit it.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.upiConfig.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ config });
}

const upsertSchema = z.object({
  upiId: z.string().min(3),
  payeeName: z.string().optional(),
});

// POST /api/upi-config
// Admin/Manager only. Sets the active UPI ID used for all agent QR
// codes going forward. We keep history rather than overwrite in
// place: the previous active row (if any) is marked inactive and a
// new row is created — so "who changed the UPI ID and when" is
// always answerable.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canConfigureUpi(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const config = await prisma.$transaction(async (tx) => {
    await tx.upiConfig.updateMany({ where: { isActive: true }, data: { isActive: false } });
    return tx.upiConfig.create({
      data: {
        upiId: parsed.data.upiId,
        payeeName: parsed.data.payeeName || null,
        isActive: true,
        updatedById: userId,
      },
    });
  });

  return NextResponse.json({ config }, { status: 201 });
}

const toggleSchema = z.object({ isActive: z.boolean() });

// PATCH /api/upi-config
// Enable/disable the currently active config without changing the
// UPI ID itself — e.g. temporarily turn off QR generation everywhere.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canConfigureUpi(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const current = await prisma.upiConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!current) return NextResponse.json({ error: "No UPI configuration exists yet" }, { status: 404 });

  const config = await prisma.upiConfig.update({
    where: { id: current.id },
    data: { isActive: parsed.data.isActive, updatedById: userId },
  });

  return NextResponse.json({ config });
}
