import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAgentsSummary } from "@/lib/agentContext";

// GET /api/agents/summary
// Dashboard cards for Agent Management: totals, entirely derived
// from the ledger (CustomerService rows + approved payment
// requests) — see lib/agentContext.ts. Open to any authenticated
// staff user, same visibility as the Agents list itself.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await getAgentsSummary();
  return NextResponse.json({ summary });
}
