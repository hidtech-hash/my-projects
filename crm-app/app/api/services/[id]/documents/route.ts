import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageServices } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const docSchema = z.object({
  name: z.string().min(1),
  required: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// POST /api/services/:id/documents
// Admin/Manager only. Adds one document requirement to a service —
// this drives both the agent's upload form and the staff review
// screen's required/optional/missing checklist, generically.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageServices(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = docSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const existingCount = await prisma.serviceDocumentRequirement.count({ where: { serviceId: params.id } });

  try {
    const doc = await prisma.serviceDocumentRequirement.create({
      data: {
        serviceId: params.id,
        name: data.name,
        required: data.required ?? true,
        sortOrder: data.sortOrder ?? existingCount,
      },
    });
    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "A document requirement with that name already exists on this service" }, { status: 409 });
    }
    throw e;
  }
}
