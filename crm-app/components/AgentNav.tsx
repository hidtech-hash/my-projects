"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function AgentNav() {
  const { data: session } = useSession();

  return (
    <nav className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-semibold">Agent Portal</span>
        <Link href="/agent" className="text-sm hover:text-slate-300">
          Dashboard
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
