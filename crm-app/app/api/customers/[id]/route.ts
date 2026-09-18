import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canCreateCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { z } from "zod";

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

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  mobile: z.string().min(10).max(15).optional(),
  altMobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  village: z.string().optional(),
  tehsil: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  notes: z.string().optional(),
});

// PUT /api/customers/:id
// Edit an existing customer's info in place — never creates a new
// record. All existing applications keep referencing this same
// customer id, so their history and payment records are untouched.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateCustomer(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = (session.user as any).id as string;

  const existing = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const customer = await prisma.customer.update({
    where: { id: params.id },
    data: {
      fullName: data.fullName,
      mobile: data.mobile,
      altMobile: data.altMobile,
      email: data.email,
      address: data.address,
      village: data.village,
      tehsil: data.tehsil,
      district: data.district,
      state: data.state,
      pincode: data.pincode,
      dob: data.dob ? new Date(data.dob) : undefined,
      gender: data.gender,
      notes: data.notes,
      updatedById: userId,
    },
  });

  await logActivity({
    userId,
    action: "CUSTOMER_UPDATED",
    entityType: "Customer",
    entityId: customer.id,
    previousValue: { fullName: existing.fullName, mobile: existing.mobile },
    newValue: { fullName: customer.fullName, mobile: customer.mobile },
  });

  return NextResponse.json({ customer });
}
