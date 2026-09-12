"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

export default function NewServicePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [customerPrice, setCustomerPrice] = useState("");
  const [agentPrice, setAgentPrice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        code: code || name,
        description: description || undefined,
        customerPrice: Number(customerPrice),
        agentPrice: Number(agentPrice),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Could not create service. Check the required fields (or the code may already exist).");
      return;
    }
    router.push("/services");
  }

  return (
    <div>
      <Nav />
      <main className="max-w-lg mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-6">Add Service</h1>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <form onSubmit={submit} className="bg-white border rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm mb-1">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              className="w-full border rounded px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PAN Card"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Code (optional — auto-generated from name if blank)</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. PAN"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">
                Customer Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                required
                className="w-full border rounded px-3 py-2 text-sm"
                value={customerPrice}
                onChange={(e) => setCustomerPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">
                Agent Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                required
                className="w-full border rounded px-3 py-2 text-sm"
                value={agentPrice}
                onChange={(e) => setAgentPrice(e.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-slate-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Service"}
          </button>
        </form>
      </main>
    </div>
  );
}
