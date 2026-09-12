"use client";

import { useEffect, useState, useCallback } from "react";
import Nav from "@/components/Nav";

export default function UpiSettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    fetch("/api/upi-config")
      .then((r) => r.json())
      .then((d) => {
        setConfig(d.config);
        if (d.config) {
          setUpiId(d.config.upiId);
          setPayeeName(d.config.payeeName ?? "");
        }
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/upi-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upiId, payeeName: payeeName || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("Could not save UPI configuration.");
      return;
    }
    setMessage("Saved. All agent QR codes now use this UPI ID.");
    load();
  }

  async function toggleActive() {
    if (!config) return;
    await fetch("/api/upi-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !config.isActive }),
    });
    load();
  }

  return (
    <div>
      <Nav />
      <main className="max-w-lg mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">UPI Configuration</h1>
          <p className="text-sm text-slate-500 mt-1">
            This UPI ID is used to generate every agent's payment QR code. Only Admin/Manager can change it.
          </p>
        </div>

        {config && (
          <div
            className={`text-sm px-4 py-3 rounded border ${
              config.isActive ? "bg-green-50 border-green-200 text-green-800" : "bg-slate-100 border-slate-200 text-slate-600"
            }`}
          >
            Currently {config.isActive ? "active" : "disabled"}: <span className="font-mono">{config.upiId}</span>
            <button onClick={toggleActive} className="ml-3 underline">
              {config.isActive ? "Disable" : "Re-enable"}
            </button>
          </div>
        )}

        {message && <p className="text-sm text-blue-700">{message}</p>}

        <form onSubmit={save} className="bg-white border rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm mb-1">
              UPI ID <span className="text-red-500">*</span>
            </label>
            <input
              required
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="business@upi"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Payee Name (shown in the payer's UPI app)</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Your Business Name"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-slate-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save UPI ID"}
          </button>
        </form>
      </main>
    </div>
  );
}
