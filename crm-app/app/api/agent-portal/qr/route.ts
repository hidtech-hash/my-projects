import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAgentRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentForUser, getAgentBalance } from "@/lib/agentContext";
import { generateUpiQrDataUrl } from "@/lib/upi";

// GET /api/agent-portal/qr
// AGENT role only. Generates a UPI QR for this agent's CURRENT
// pending amount, computed fresh on the server every time this is
// called — the agent cannot influence the amount encoded in the QR
// in any way (there is no request body, no query param it reads for
// amount). If pending is 0, no QR is generated.
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAgentRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as any).id as string;
  const agent = await getAgentForUser(userId);
  if (!agent) {
    return NextResponse.json({ error: "No agent profile is linked to this login" }, { status: 404 });
  }

  const balance = await getAgentBalance(agent.id);

  if (balance.pending <= 0) {
    return NextResponse.json({ pending: 0, qr: null });
  }

  const config = await prisma.upiConfig.findFirst({ where: { isActive: true }, orderBy: { updatedAt: "desc" } });
  if (!config) {
    return NextResponse.json({ pending: balance.pending, qr: null, error: "UPI not configured yet" });
  }

  const { dataUrl } = await generateUpiQrDataUrl({
    upiId: config.upiId,
    payeeName: config.payeeName,
    amount: balance.pending,
    note: `${agent.agentCode} pending payment`,
  });

  return NextResponse.json({ pending: balance.pending, qr: dataUrl });
}
