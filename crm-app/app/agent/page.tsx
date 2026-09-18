"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AgentNav from "@/components/AgentNav";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-slate-200 text-slate-700",
  PENDING_REVIEW: "bg-amber-100 text-amber-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  PROCESSING: "bg-amber-100 text-amber-700",
  DOCUMENT_REQUIRED: "bg-orange-100 text-orange-700",
  SUBMITTED: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-300 text-slate-700",
};

export default function AgentDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [qr, setQr] = useState<any>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/agent-portal/qr")
      .then((r) => r.json())
      .then(setQr);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetch(`/api/agent-portal/dashboard?search=${encodeURIComponent(search)}`)
        .then((r) => r.json())
        .then(setData);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  if (!data?.agent) {
    return (
      <div>
        <AgentNav />
        <main className="max-w-5xl mx-auto p-8 text-slate-400">Loading...</main>
      </div>
    );
  }

  const { agent, applications, summary } = data;

  return (
    <div>
      <AgentNav />
      <main className="max-w-5xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Welcome, {agent.name}</h1>
            <p className="text-slate-500 text-sm">{agent.agentCode}</p>
          </div>
          <Link href="/agent/apply" className="bg-slate-900 text-white px-4 py-2 rounded text-sm">
            + Apply for Service
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          <SummaryCard label="Total Applications" value={summary.totalApplications} />
          <SummaryCard label="Total Amount" value={`₹${summary.totalAmount.toLocaleString()}`} />
          <SummaryCard label="Received" value={`₹${summary.totalReceived.toLocaleString()}`} tone="green" />
          <SummaryCard
            label="Pending"
            value={`₹${summary.totalPending.toLocaleString()}`}
            tone={summary.totalPending > 0 ? "amber" : "green"}
          />
        </div>

        {/* Payment QR */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Pay Pending Amount</h2>
          {!qr ? (
            <p className="text-slate-400 text-sm">Loading...</p>
          ) : qr.pending <= 0 ? (
            <p className="text-green-700 text-sm">No pending payment. You're all caught up.</p>
          ) : qr.qr ? (
            <div className="flex items-center gap-6">
              <img src={qr.qr} alt="UPI payment QR" className="w-40 h-40 border rounded" />
              <div>
                <p className="text-sm text-slate-600 mb-1">
                  Scan with any UPI app to pay your current pending amount:
                </p>
                <p className="text-2xl font-semibold">₹{qr.pending.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-2">
                  This QR always reflects your live pending balance — it updates automatically once a
                  payment is verified.
                </p>
                <div className="flex items-center gap-3 mt-3">
                  {qr.uri && (
                    <a
                      href={qr.uri}
                      className="inline-block bg-green-700 text-white px-3 py-1.5 rounded text-sm"
                    >
                      Pay Through UPI App
                    </a>
                  )}
                  <Link
                    href="/agent/payments"
                    className="inline-block bg-slate-900 text-white px-3 py-1.5 rounded text-sm"
                  >
                    Submit Payment Proof →
                  </Link>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  On a phone, this opens your installed UPI app (Google Pay, PhonePe, Paytm, etc.) with
                  the amount pre-filled. On a desktop browser it may not do anything — scan the QR with
                  your phone instead. Either way, this only opens the payment — you still need to submit
                  the UTR and screenshot below after paying.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-amber-700 text-sm">
              You have ₹{qr.pending.toLocaleString()} pending, but payment isn't configured yet — contact
              your admin.
            </p>
          )}
        </div>

        {/* Applications */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <h2 className="font-semibold">My Applications</h2>
            <input
              className="border rounded px-3 py-1.5 text-sm w-64"
              placeholder="Search customer, mobile, ref no., service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-4 py-2 whitespace-nowrap">Customer</th>
                  <th className="px-4 py-2 whitespace-nowrap">Service</th>
                  <th className="px-4 py-2 whitespace-nowrap">Ref. No.</th>
                  <th className="px-4 py-2 whitespace-nowrap">Applied</th>
                  <th className="px-4 py-2 whitespace-nowrap">Status</th>
                  <th className="px-4 py-2 whitespace-nowrap">Amount</th>
                  <th className="px-4 py-2 whitespace-nowrap">Received</th>
                  <th className="px-4 py-2 whitespace-nowrap">Pending</th>
                  <th className="px-4 py-2 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                      No applications found.
                    </td>
                  </tr>
                )}
                {applications.map((a: any) => {
                  const amount = Number(a.amount ?? 0);
                  const received = Number(a.amountReceived ?? 0);
                  return (
                    <tr key={a.id} className="border-t">
                      <td className="px-4 py-2 max-w-[180px] truncate" title={a.customer.fullName}>
                        {a.customer.fullName}
                        <div className="text-xs text-slate-400">{a.customer.mobile}</div>
                      </td>
                      <td className="px-4 py-2 max-w-[180px] truncate" title={a.service.name}>
                        {a.service.name}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">{a.referenceNumber ?? "-"}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{new Date(a.appliedDate).toLocaleDateString()}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[a.status] ?? "bg-slate-100"}`}>
                          {a.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">₹{amount.toLocaleString()}</td>
                      <td className="px-4 py-2 whitespace-nowrap">₹{received.toLocaleString()}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={amount - received > 0 ? "text-amber-700 font-medium" : "text-green-700"}>
                          ₹{(amount - received).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Link href={`/agent/applications/${a.id}`} className="text-blue-600 text-xs font-medium hover:underline">
                          {a.status === "REJECTED" ? "Fix & Resubmit" : "View"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
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
    <div className="bg-white border rounded-lg p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
