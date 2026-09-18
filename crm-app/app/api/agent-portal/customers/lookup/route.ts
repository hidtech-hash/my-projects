import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAgentRole } from "@/lib/auth";
import { findCustomerByMobile } from "@/lib/customerLookup";

// GET /api/agent-portal/customers/lookup?mobile=9876543210
// Same lookup as the staff version, exposed under the agent-portal
// namespace so it's reachable under the AGENT middleware allowlist.
// Deliberately searches ALL customers (not just this agent's past
// customers) — a customer might already exist from a walk-in or via
// a different agent, and we never want to create a duplicate.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAgentRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const mobile = new URL(req.url).searchParams.get("mobile")?.trim();
  if (!mobile) return NextResponse.json({ error: "mobile is required" }, { status: 400 });

  const customer = await findCustomerByMobile(mobile);
  return NextResponse.json({ customer });
}
