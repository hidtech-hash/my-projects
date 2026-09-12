"use client";

import { useEffect, useState, useCallback } from "react";
import AgentNav from "@/components/AgentNav";

const STATUS_BADGE: Record<string, string> = {
  PENDING_VERIFICATION: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function AgentPaymentsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [pending, setPending] = useState<number | null>(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    fetch("/api/agent-portal/payment-requests")
      .then((r) => r.json())
      .then((d) => setRequests(d.requests ?? []));
    fetch("/api/agent-portal/qr")
      .then((r) => r.json())
      .then((d) => setPending(d.pending ?? 0));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!utrNumber || !screenshot) {
      setError("UTR and a payment screenshot are both required.");
      return;
    }
    setSubmitting(true);
    const form = new FormData();
    form.append("utrNumber", utrNumber);
    form.append("screenshot", screenshot);
    const res = await fetch("/api/agent-portal/payment-requests", { method: "POST", body: form });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not submit payment request.");
      return;
    }
    setUtrNumber("");
    setScreenshot(null);
    setSuccess("Payment request submitted. A manager will verify it shortly.");
    load();
  }

  return (
    <div>
      <AgentNav />
      <main className="max-w-3xl mx-auto p-8 space-y-8">
        <h1 className="text-2xl font-semibold">My Payments</h1>

        {/* Submit new request */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-semibold mb-1">Submit Payment Proof</h2>
          <p className="text-sm text-slate-500 mb-4">
            After paying via the UPI QR on your dashboard, submit the transaction reference number and a
            screenshot here. A manager will verify the actual amount received — you don't enter an amount
            yourself.
          </p>

          {pending !== null && pending <= 0 ? (
            <p className="text-green-700 text-sm">You have no pending payment right now.</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              {success && <p className="text-green-700 text-sm">{success}</p>}
              <div>
                <label className="block text-sm mb-1">
                  UTR / Transaction Reference Number <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. 123456789012"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">
                  Payment Screenshot <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="w-full text-sm"
                  onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="bg-slate-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Payment Request"}
              </button>
            </form>
          )}
        </div>

        {/* History */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <h2 className="font-semibold px-6 pt-6 pb-4">Payment Request History</h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2">UTR</th>
                <th className="px-4 py-2">Screenshot</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Verified Amount</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No payment requests submitted yet.
                  </td>
                </tr>
              )}
              {requests.map((r) => (
                <tr key={r.id} className="border-t">
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
                    {r.status === "REJECTED" && r.rejectionReason && (
                      <div className="text-xs text-slate-400 mt-1">{r.rejectionReason}</div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {r.verifiedAmount != null ? `₹${Number(r.verifiedAmount).toLocaleString()}` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
