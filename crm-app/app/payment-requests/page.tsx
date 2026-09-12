"use client";

import { useEffect, useState, useCallback } from "react";
import Nav from "@/components/Nav";

const STATUS_BADGE: Record<string, string> = {
  PENDING_VERIFICATION: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function PaymentRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("PENDING_VERIFICATION");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const load = useCallback(() => {
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/payment-requests${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setRequests(d.requests ?? []);
        setTotals(d.totals ?? null);
      });
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <Nav />
      <main className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Agent Payment Requests</h1>
          {totals && (
            <p className="text-sm text-slate-500">
              {totals.pendingCount} awaiting verification · ₹{totals.totalApproved.toLocaleString()} approved
              total
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {["PENDING_VERIFICATION", "APPROVED", "REJECTED", ""].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded border ${
                statusFilter === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600"
              }`}
            >
              {s ? s.replace(/_/g, " ") : "All"}
            </button>
          ))}
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-4 py-2">Agent</th>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2">UTR</th>
                <th className="px-4 py-2">Screenshot</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Verified Amount</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No payment requests here.
                  </td>
                </tr>
              )}
              {requests.map((r) =>
                verifyingId === r.id ? (
                  <VerifyRow
                    key={r.id}
                    request={r}
                    onDone={() => {
                      setVerifyingId(null);
                      load();
                    }}
                    onCancel={() => setVerifyingId(null)}
                  />
                ) : (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2">
                      {r.agent.name}
                      <div className="text-xs text-slate-400">{r.agent.agentCode}</div>
                    </td>
                    <td className="px-4 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2">{r.utrNumber}</td>
                    <td className="px-4 py-2">
                      <a href={r.screenshotUrl} target="_blank" className="text-blue-600 hover:underline">
                        View
                      </a>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-1 rounded ${STATUS_BADGE[r.status]}`}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {r.verifiedAmount != null ? `₹${Number(r.verifiedAmount).toLocaleString()}` : "-"}
                    </td>
                    <td className="px-4 py-2">
                      {r.status === "PENDING_VERIFICATION" && (
                        <button
                          onClick={() => setVerifyingId(r.id)}
                          className="text-blue-600 text-xs hover:underline"
                        >
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function VerifyRow({ request, onDone, onCancel }: { request: any; onDone: () => void; onCancel: () => void }) {
  const [verifiedAmount, setVerifiedAmount] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function approve() {
    if (!verifiedAmount || Number(verifiedAmount) <= 0) {
      setError("Enter the actual verified amount received.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/payment-requests/${request.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "APPROVE", verifiedAmount: Number(verifiedAmount) }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not approve.");
      return;
    }
    onDone();
  }

  async function reject() {
    setSaving(true);
    const res = await fetch(`/api/payment-requests/${request.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REJECT", rejectionReason: rejectionReason || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not reject.");
      return;
    }
    onDone();
  }

  return (
    <tr className="border-t bg-slate-50">
      <td colSpan={7} className="px-4 py-4">
        <div className="flex items-start gap-6">
          <img
            src={request.screenshotUrl}
            alt="Payment screenshot"
            className="w-32 h-32 object-cover border rounded"
          />
          <div className="flex-1 space-y-3">
            <p className="text-sm">
              <span className="font-medium">{request.agent.name}</span> · UTR:{" "}
              <span className="font-mono">{request.utrNumber}</span>
            </p>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs mb-1">Verified Amount Received (₹)</label>
                <input
                  className="w-32 border rounded px-2 py-1.5 text-sm"
                  value={verifiedAmount}
                  onChange={(e) => setVerifiedAmount(e.target.value)}
                  placeholder="e.g. 1200"
                />
              </div>
              <button
                onClick={approve}
                disabled={saving}
                className="bg-green-700 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
              >
                Approve
              </button>
              <span className="text-slate-300">|</span>
              <div>
                <label className="block text-xs mb-1">Rejection Reason (optional)</label>
                <input
                  className="w-48 border rounded px-2 py-1.5 text-sm"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. UTR not found"
                />
              </div>
              <button
                onClick={reject}
                disabled={saving}
                className="bg-red-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
              >
                Reject
              </button>
              <button onClick={onCancel} className="text-slate-500 text-sm px-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
