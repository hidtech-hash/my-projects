"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Nav() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdminOrManager = role === "ADMIN" || role === "MANAGER";

  return (
    <nav className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-semibold">CRM</span>
        <Link href="/dashboard" className="text-sm hover:text-slate-300">
          Dashboard
        </Link>
        <Link href="/customers" className="text-sm hover:text-slate-300">
          Customers
        </Link>
        <Link href="/agents" className="text-sm hover:text-slate-300">
          Agents
        </Link>
        <Link href="/services" className="text-sm hover:text-slate-300">
          Services
        </Link>
        {isAdminOrManager && (
          <>
            <Link href="/payment-requests" className="text-sm hover:text-slate-300">
              Payment Requests
            </Link>
            <Link href="/settings/upi" className="text-sm hover:text-slate-300">
              UPI Settings
            </Link>
          </>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm">
        {session?.user && (
          <span className="text-slate-300">
            {session.user.name} · {(session.user as any).role}
          </span>
        )}
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="hover:text-slate-300">
          Logout
        </button>
      </div>
    </nav>
  );
}
