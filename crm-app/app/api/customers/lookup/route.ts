import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findCustomerByMobile } from "@/lib/customerLookup";

// GET /api/customers/lookup?mobile=9876543210
// Used by the "Add Customer" flow: check the mobile number first,
// before asking for anything else. If found, the UI opens the
// existing profile instead of re-collecting all their details.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mobile = new URL(req.url).searchParams.get("mobile")?.trim();
  if (!mobile) return NextResponse.json({ error: "mobile is required" }, { status: 400 });

  const customer = await findCustomerByMobile(mobile);
  return NextResponse.json({ customer });
}
