"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";

type Agent = {
  id: string;
  agentCode: string;
  name: string;
  enterpriseName: string;
  mobile: string;
  city: string | null;
  status: string;
  _count: { customerServices: number };
  user: { email: string; isActive: boolean } | null;
  pendingPayment: number;
  pendingSinceDays: number | null;
};

type Summary = {
  totalAgents: number;
  totalPendingPayment: number;
  totalServicesReferred: number;
  totalPaidPayment: number;
  agentsWithPendingPayment: number;
  agentsWithNoDue: number;
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents/summary")
      .then((r) => r.json())
      .then((d) => setSummary(d.summary ?? null));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/agents?search=${encodeURIComponent(search)}`)
        .then((r) => r.json())
        .then((d) => setAgents(d.agents ?? []))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div>
      <Nav />
      <main className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Agents</h1>
          <Link href="/agents/new" className="bg-slate-900 text-white px-4 py-2 rounded text-sm">
            + Add Agent
          </Link>
        </div>

        {summary && (
          <div className="grid grid-cols-6 gap-3 mb-6">
            <SummaryCard label="Total Agents" value={summary.totalAgents} />
            <SummaryCard
              label="Total Pending Payment"
              value={`₹${summary.totalPendingPayment.toLocaleString()}`}
              tone={summary.totalPendingPayment > 0 ? "amber" : "green"}
            />
            <SummaryCard label="Total Services Referred" value={summary.totalServicesReferred} />
            <SummaryCard
              label="Total Paid Payment"
              value={`₹${summary.totalPaidPayment.toLocaleString()}`}
              tone="green"
            />
            <SummaryCard
              label="Agents With Pending Payment"
              value={summary.agentsWithPendingPayment}
              tone={summary.agentsWithPendingPayment > 0 ? "amber" : undefined}
            />
            <SummaryCard label="Agents With No Due" value={summary.agentsWithNoDue} tone="green" />
          </div>
        )}

        <input
          className="w-full border rounded px-3 py-2 mb-6"
          placeholder="Search by name, enterprise name, mobile, or agent ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-4 py-2 whitespace-nowrap">Agent ID</th>
                  <th className="px-4 py-2 whitespace-nowrap">Name</th>
                  <th className="px-4 py-2 whitespace-nowrap">Enterprise Name</th>
                  <th className="px-4 py-2 whitespace-nowrap">Mobile</th>
                  <th className="px-4 py-2 whitespace-nowrap">City</th>
                  <th className="px-4 py-2 whitespace-nowrap">Status</th>
                  <th className="px-4 py-2 whitespace-nowrap">Login</th>
                  <th className="px-4 py-2 whitespace-nowrap">Services Referred</th>
                  <th className="px-4 py-2 whitespace-nowrap">Pending Payment</th>
                  <th className="px-4 py-2 whitespace-nowrap">Payment Pending From</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && agents.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-slate-400">
                      No agents found.
                    </td>
                  </tr>
                )}
                {agents.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Link href={`/agents/${a.id}`} className="text-blue-600 hover:underline">
                        {a.agentCode}
                      </Link>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{a.name}</td>
                    <td className="px-4 py-2 max-w-[180px] truncate" title={a.enterpriseName}>
                      {a.enterpriseName || <span className="text-amber-600 text-xs">Not set</span>}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{a.mobile}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{a.city ?? "-"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          a.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {a.user ? (
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            a.user.isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {a.user.isActive ? "Active login" : "Login disabled"}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">No login</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{a._count.customerServices}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {a.pendingPayment > 0 ? (
                        <span className="text-amber-700 font-medium">₹{a.pendingPayment.toLocaleString()}</span>
                      ) : (
                        <span className="text-green-700">₹0</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {a.pendingSinceDays === null ? (
                        <span className="text-slate-400">No Due</span>
                      ) : (
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            a.pendingSinceDays <= 7 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {a.pendingSinceDays} {a.pendingSinceDays === 1 ? "day" : "days"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone?: "green" | "amber" }) {
  const toneClass = tone === "green" ? "text-green-700" : tone === "amber" ? "text-amber-700" : "text-slate-900";
  return (
    <div className="bg-white border rounded-lg p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-base font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
