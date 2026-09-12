import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/employees — used to populate the "assign to" dropdown.
// Anyone with role EMPLOYEE (or ADMIN/MANAGER, who can also do
// work themselves) is a valid assignee. AGENT-role users are
// referral sources, not staff who do the work — explicitly excluded
// so they never show up here.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employees = await prisma.user.findMany({
    where: { isActive: true, role: { not: "AGENT" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });
  return NextResponse.json({ employees });
}
