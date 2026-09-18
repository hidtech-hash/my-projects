import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAgentRole } from "@/lib/auth";
import { getServiceWithConfig } from "@/lib/services";

// GET /api/agent-portal/services/:id
// Same service-with-dynamic-config lookup the staff Service
// Configuration page uses — this is what makes the Apply for
// Service form render its fields/documents generically for agents.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAgentRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = await getServiceWithConfig(params.id);
  if (!service || !service.isActive) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ service });
}
