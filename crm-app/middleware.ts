import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Paths an AGENT-role session is allowed to reach. Everything else
// (all admin/manager pages AND their APIs) is hard-blocked here, at
// the routing layer — not just hidden in the UI. This is on top of,
// not instead of, the per-endpoint role checks already in each API
// route (defense in depth).
const AGENT_ALLOWED_PREFIXES = ["/agent", "/api/agent-portal", "/api/auth"];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as any;
    const role = token?.role;
    const path = req.nextUrl.pathname;

    if (role === "AGENT") {
      const allowed = AGENT_ALLOWED_PREFIXES.some((p) => path.startsWith(p));
      if (!allowed) {
        // API calls get a plain 403 (no redirect — a fetch() call
        // shouldn't receive an HTML redirect response); page loads
        // get sent to the agent's own dashboard.
        if (path.startsWith("/api")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/agent", req.url));
      }
    }
    return NextResponse.next();
  },
  { pages: { signIn: "/login" } }
);

export const config = {
  matcher: [
    /*
     * Protect everything except:
     * - /login
     * - /api/auth/* (NextAuth internals)
     * - static assets
     * - uploaded payment screenshots (served as static files)
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
