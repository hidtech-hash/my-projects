"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";

type Agent = {
  id: string;
  agentCode: string;
  name: string;
  mobile: string;
  city: string | null;
  status: string;
  _count: { customerServices: number };
  user: { email: string; isActive: boolean } | null;
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

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
      <main className="max-w-5xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Agents</h1>
          <Link href="/agents/new" className="bg-slate-900 text-white px-4 py-2 rounded text-sm">
            + Add Agent
          </Link>
        </div>

        <input
          className="w-full border rounded px-3 py-2 mb-6"
          placeholder="Search by name, mobile, or agent ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-4 py-2">Agent ID</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Mobile</th>
                <th className="px-4 py-2">City</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Login</th>
                <th className="px-4 py-2">Services Referred</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && agents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No agents found.
                  </td>
                </tr>
              )}
              {agents.map((a) => (
                <tr key={a.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/agents/${a.id}`} className="text-blue-600 hover:underline">
                      {a.agentCode}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{a.name}</td>
                  <td className="px-4 py-2">{a.mobile}</td>
                  <td className="px-4 py-2">{a.city ?? "-"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        a.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
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
                  <td className="px-4 py-2">{a._count.customerServices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
