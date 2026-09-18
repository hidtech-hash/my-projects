"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function AgentNav() {
  const { data: session } = useSession();
  const [brandName, setBrandName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agent-portal/me")
      .then((r) => r.json())
      .then((d) => setBrandName(d.agent?.enterpriseName || null))
      .catch(() => setBrandName(null));
  }, []);

  return (
    <nav className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        {/* Enterprise Name from the agent's own profile, not
            hard-coded — falls back to "Agent Portal" only while it's
            still loading or if the agent has no enterprise name set
            yet (existing agents created before this field existed). */}
        <span className="font-semibold">{brandName || "Agent Portal"}</span>
        <Link href="/agent" className="text-sm hover:text-slate-300">
          Dashboard
        </Link>
        <Link href="/agent/apply" className="text-sm hover:text-slate-300">
          Apply for Service
        </Link>
        <Link href="/agent/payments" className="text-sm hover:text-slate-300">
          My Payments
        </Link>
      </div>
      <div className="flex items-center gap-4 text-sm">
        {session?.user && <span className="text-slate-300">{session.user.name}</span>}
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="hover:text-slate-300">
          Logout
        </button>
      </div>
    </nav>
  );
}
