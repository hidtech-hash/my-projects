import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canCreateCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextCustomerCode } from "@/lib/codes";
import { logActivity } from "@/lib/activityLog";
import { z } from "zod";

// GET /api/customers?search=rahul&page=1
// Searches by name, mobile, or customer code — used by the
// global search bar and the customers list page.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = 20;

  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { mobile: { contains: search } },
            { customerCode: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { services: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ customers, total, page, pageSize });
}

const createCustomerSchema = z.object({
  fullName: z.string().min(2),
  mobile: z.string().min(10).max(15),
  altMobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  village: z.string().optional(),
  tehsil: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  dob: z.string().optional(), // ISO date string from the form
  gender: z.string().optional(),
  notes: z.string().optional(),
});

// POST /api/customers
// Creates a customer. Checks for a likely duplicate by mobile
// number first and returns it instead of silently creating a
// second record with the same phone number.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateCustomer(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Duplicate check by mobile number. If found and the caller
  // hasn't explicitly confirmed to proceed anyway, surface it
  // instead of creating a new record.
  const existing = await prisma.customer.findFirst({
    where: { mobile: data.mobile, deletedAt: null },
  });
  if (existing && !body.confirmDuplicate) {
    return NextResponse.json(
      {
        duplicate: true,
        existingCustomer: {
          id: existing.id,
          customerCode: existing.customerCode,
          fullName: existing.fullName,
          mobile: existing.mobile,
        },
      },
      { status: 409 }
    );
  }

  const customerCode = await nextCustomerCode();
  const userId = (session.user as any).id as string;

  const customer = await prisma.customer.create({
    data: {
      customerCode,
      fullName: data.fullName,
      mobile: data.mobile,
      altMobile: data.altMobile || null,
      email: data.email || null,
      address: data.address || null,
      village: data.village || null,
      tehsil: data.tehsil || null,
      district: data.district || null,
      state: data.state || null,
      pincode: data.pincode || null,
      dob: data.dob ? new Date(data.dob) : null,
      gender: data.gender || null,
      notes: data.notes || null,
      createdById: userId,
    },
  });

  await logActivity({
    userId,
    action: "CUSTOMER_CREATED",
    entityType: "Customer",
    entityId: customer.id,
    newValue: { customerCode: customer.customerCode, fullName: customer.fullName },
  });

  return NextResponse.json({ customer }, { status: 201 });
}
