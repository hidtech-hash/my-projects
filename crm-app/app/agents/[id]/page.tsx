"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";

export default function AgentProfilePage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/agents/${params.id}`)
      .then((r) => r.json())
      .then(setData);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Quick "mark as fully paid" shortcut for a work item — sets
  // amountReceived to the full amount and status to PAID.
  async function markFullyPaid(cs: any) {
    await fetch(`/api/customer-services/${cs.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountReceived: Number(cs.amount ?? 0),
        paymentStatus: "PAID",
      }),
    });
    load();
  }

  async function toggleLoginActive() {
    if (!data?.agent?.user) return;
    await fetch(`/api/agents/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginIsActive: !data.agent.user.isActive }),
    });
    load();
  }

  if (!data?.agent) {
    return (
      <div>
        <Nav />
        <main className="max-w-4xl mx-auto p-8 text-slate-400">Loading...</main>
      </div>
    );
  }

  const { agent, summary } = data;

  return (
    <div>
      <Nav />
      <main className="max-w-5xl mx-auto p-8 space-y-8">
        <div className="bg-white border rounded-lg p-6">
          <h1 className="text-xl font-semibold">{agent.name}</h1>
          <p className="text-slate-500 text-sm mb-3">
            {agent.agentCode} · {agent.mobile} · {agent.city ?? "-"}, {agent.state ?? "-"}
          </p>

          {/* Portal login status */}
          {agent.user ? (
            <div className="text-sm flex items-center gap-3">
              <span className="text-slate-600">
                Portal login: <span className="font-mono">{agent.user.email}</span>
              </span>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  agent.user.isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                }`}
              >
                {agent.user.isActive ? "Active" : "Disabled"}
              </span>
              <button onClick={toggleLoginActive} className="text-blue-600 text-xs hover:underline">
                {agent.user.isActive ? "Disable Login" : "Enable Login"}
              </button>
              <button onClick={() => setShowLoginForm((v) => !v)} className="text-blue-600 text-xs hover:underline">
                Reset Password
              </button>
            </div>
          ) : (
            <div className="text-sm">
              <span className="text-slate-500">No portal login yet.</span>{" "}
              <button onClick={() => setShowLoginForm((v) => !v)} className="text-blue-600 hover:underline">
                Create one
              </button>
            </div>
          )}

          {showLoginForm && (
            <CreateOrResetLoginForm
              agentId={agent.id}
              hasLogin={!!agent.user}
              onDone={() => {
                setShowLoginForm(false);
                load();
              }}
            />
          )}
        </div>

        {/* Payment summary cards — this is the core "agent tracking" view */}
        <div className="grid grid-cols-4 gap-4">
          <SummaryCard label="Services Referred" value={summary.totalReferred} />
          <SummaryCard label="Total Business" value={`₹${summary.totalBusiness.toLocaleString()}`} />
          <SummaryCard
            label="Amount Received"
            value={`₹${summary.totalReceived.toLocaleString()}`}
            tone="green"
          />
          <SummaryCard
            label="Pending Payment"
            value={`₹${summary.totalPending.toLocaleString()}`}
            tone={summary.totalPending > 0 ? "amber" : "green"}
          />
        </div>

        {/* Per-service breakdown */}
        {Object.keys(summary.byService).length > 0 && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="font-semibold mb-4">By Service</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1 pr-4">Service</th>
                  <th className="py-1 pr-4">Requests</th>
                  <th className="py-1 pr-4">Total</th>
                  <th className="py-1 pr-4">Pending</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.byService).map(([name, s]: [string, any]) => (
                  <tr key={name} className="border-t">
                    <td className="py-1.5 pr-4">{name}</td>
                    <td className="py-1.5 pr-4">{s.count}</td>
                    <td className="py-1.5 pr-4">₹{s.total.toLocaleString()}</td>
                    <td className={`py-1.5 pr-4 ${s.pending > 0 ? "text-amber-700" : "text-green-700"}`}>
                      ₹{s.pending.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Referred services */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <h2 className="font-semibold px-6 pt-6 pb-4">Customers / Services Referred</h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Agent Price</th>
                <th className="px-4 py-2">Received</th>
                <th className="px-4 py-2">Pending</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {agent.customerServices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    No services referred by this agent yet.
                  </td>
                </tr>
              )}
              {agent.customerServices.map((cs: any) => {
                const amount = Number(cs.amount ?? 0);
                const received = Number(cs.amountReceived ?? 0);
                const pending = amount - received;
                return (
                  <tr key={cs.id} className="border-t">
                    <td className="px-4 py-2">
                      <Link href={`/customers/${cs.customer.id}`} className="text-blue-600 hover:underline">
                        {cs.customer.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{cs.service.name}</td>
                    <td className="px-4 py-2">{cs.assignedEmployee?.name ?? "-"}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs px-2 py-1 rounded bg-slate-100">
                        {cs.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2">₹{amount.toLocaleString()}</td>
                    <td className="px-4 py-2">₹{received.toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <span className={pending > 0 ? "text-amber-700 font-medium" : "text-green-700"}>
                        ₹{pending.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {pending > 0 && (
                        <button
                          onClick={() => markFullyPaid(cs)}
                          className="text-blue-600 text-xs hover:underline"
                        >
                          Mark Fully Paid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Payment request history (UTR/screenshot verification trail) */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <h2 className="font-semibold">Payment Request History</h2>
            <Link href="/payment-requests" className="text-blue-600 text-xs hover:underline">
              Go to Payment Requests →
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2">UTR</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Verified Amount</th>
                <th className="px-4 py-2">Verified By</th>
              </tr>
            </thead>
            <tbody>
              {(agent.paymentRequests ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No payment requests submitted by this agent yet.
                  </td>
                </tr>
              )}
              {(agent.paymentRequests ?? []).map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">{r.utrNumber}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        r.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : r.status === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {r.verifiedAmount != null ? `₹${Number(r.verifiedAmount).toLocaleString()}` : "-"}
                  </td>
                  <td className="px-4 py-2">{r.verifiedBy?.name ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function CreateOrResetLoginForm({
  agentId,
  hasLogin,
  onDone,
}: {
  agentId: string;
  hasLogin: boolean;
  onDone: () => void;
}) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError("");
    setSaving(true);
    const body: Record<string, unknown> = { password };
    if (!hasLogin) {
      body.createLogin = true;
      body.loginId = loginId;
    }
    const res = await fetch(`/api/agents/${agentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save.");
      return;
    }
    onDone();
  }

  return (
    <div className="mt-3 bg-slate-50 border rounded p-3 flex items-end gap-3">
      {!hasLogin && (
        <div>
          <label className="block text-xs mb-1">Login ID</label>
          <input
            className="w-40 border rounded px-2 py-1.5 text-sm"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
          />
        </div>
      )}
      <div>
        <label className="block text-xs mb-1">{hasLogin ? "New Password" : "Password"}</label>
        <input
          type="password"
          className="w-40 border rounded px-2 py-1.5 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button
        onClick={submit}
        disabled={saving}
        className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
      >
        {saving ? "Saving..." : hasLogin ? "Reset Password" : "Create Login"}
      </button>
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone?: "green" | "amber" }) {
  const toneClass = tone === "green" ? "text-green-700" : tone === "amber" ? "text-amber-700" : "text-slate-900";
  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
