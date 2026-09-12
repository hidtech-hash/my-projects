import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAgentRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentForUser, getAgentBalance } from "@/lib/agentContext";
import { logActivity } from "@/lib/activityLog";
import { savePaymentScreenshot } from "@/lib/uploads";

// GET /api/agent-portal/payment-requests
// AGENT role only. This agent's own submitted payment requests and
// their status — never another agent's.
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAgentRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as any).id as string;
  const agent = await getAgentForUser(userId);
  if (!agent) return NextResponse.json({ error: "No agent profile is linked to this login" }, { status: 404 });

  const requests = await prisma.agentPaymentRequest.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

// POST /api/agent-portal/payment-requests
// AGENT role only. Multipart form: utrNumber (text) + screenshot
// (file). Deliberately has NO amount field — see lib/agentContext.ts
// and the schema comment on AgentPaymentRequest for why: the agent
// cannot tell the system how much they paid. This only ever creates
// a PENDING_VERIFICATION request; it never touches the agent's
// balance. Only /api/payment-requests/:id (Manager/Admin) can do that.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAgentRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as any).id as string;
  const agent = await getAgentForUser(userId);
  if (!agent) return NextResponse.json({ error: "No agent profile is linked to this login" }, { status: 404 });

  const balance = await getAgentBalance(agent.id);
  if (balance.pending <= 0) {
    return NextResponse.json({ error: "You have no pending payment to submit" }, { status: 400 });
  }

  const form = await req.formData();
  const utrNumber = (form.get("utrNumber") as string | null)?.trim();
  const screenshot = form.get("screenshot") as File | null;

  if (!utrNumber) {
    return NextResponse.json({ error: "UTR / transaction reference number is required" }, { status: 400 });
  }
  if (!screenshot || typeof screenshot === "string") {
    return NextResponse.json({ error: "Payment screenshot is required" }, { status: 400 });
  }

  const saved = await savePaymentScreenshot(screenshot);
  if ("error" in saved) {
    return NextResponse.json({ error: saved.error }, { status: 400 });
  }

  const request_ = await prisma.agentPaymentRequest.create({
    data: {
      agentId: agent.id,
      utrNumber,
      screenshotUrl: saved.url,
      submittedById: userId,
    },
  });

  await logActivity({
    userId,
    action: "AGENT_PAYMENT_REQUEST_SUBMITTED",
    entityType: "AgentPaymentRequest",
    entityId: request_.id,
    newValue: { agentId: agent.id, utrNumber },
  });

  return NextResponse.json({ request: request_ }, { status: 201 });
}
