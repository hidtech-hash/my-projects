import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageServices } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const fieldSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, underscores only"),
  label: z.string().min(1),
  fieldType: z.enum(["TEXT", "NUMBER", "DATE", "EMAIL", "PHONE", "PASSWORD", "TEXTAREA", "SELECT", "CHECKBOX"]),
  options: z.array(z.string()).optional(),
  requiredAtSubmission: z.boolean().optional(),
  editableAfterSubmission: z.boolean().optional(),
  visibleToAgent: z.boolean().optional(),
  visibleToEmployee: z.boolean().optional(),
  visibleToAdmin: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// POST /api/services/:id/fields
// Admin/Manager only. Adds one dynamic application field to a
// service — this is the entire mechanism behind "different services
// have different fields," with zero per-service code.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageServices(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = fieldSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  if (data.fieldType === "SELECT" && (!data.options || data.options.length === 0)) {
    return NextResponse.json({ error: "SELECT fields need at least one option" }, { status: 400 });
  }

  const existingCount = await prisma.serviceField.count({ where: { serviceId: params.id } });

  try {
    const field = await prisma.serviceField.create({
      data: {
        serviceId: params.id,
        name: data.name,
        label: data.label,
        fieldType: data.fieldType,
        options: data.options ?? undefined,
        requiredAtSubmission: data.requiredAtSubmission ?? false,
        editableAfterSubmission: data.editableAfterSubmission ?? true,
        visibleToAgent: data.visibleToAgent ?? true,
        visibleToEmployee: data.visibleToEmployee ?? true,
        visibleToAdmin: data.visibleToAdmin ?? true,
        sortOrder: data.sortOrder ?? existingCount,
      },
    });
    return NextResponse.json({ field }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "A field with that name already exists on this service" }, { status: 409 });
    }
    throw e;
  }
}
