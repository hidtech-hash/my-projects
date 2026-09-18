import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAgentRole } from "@/lib/auth";
import { listActiveServices } from "@/lib/services";

// GET /api/agent-portal/services
// The exact same active-services list Admin/Manager configure under
// Service Management (via the shared lib/services.ts query) — just
// reachable from inside the AGENT middleware allowlist. This is NOT
// a separate agent service list; there is only one Service table.
// Any service Admin/Manager marks active here automatically shows up
// for agents with zero code changes, same as it already does for
// staff.
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAgentRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const services = await listActiveServices();
  return NextResponse.json({ services });
}
