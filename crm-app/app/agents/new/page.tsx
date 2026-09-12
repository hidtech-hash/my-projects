"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

export default function NewAgentPage() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [createLogin, setCreateLogin] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(name: string, value: string) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        createLogin,
        loginId: createLogin ? loginId : undefined,
        password: createLogin ? password : undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not create agent. Check the required fields.");
      return;
    }
    const data = await res.json();
    router.push(`/agents/${data.agent.id}`);
  }

  return (
    <div>
      <Nav />
      <main className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-1">Add Agent</h1>
        <p className="text-sm text-slate-500 mb-6">
          Agents get the fixed "Agent Price" already set per service (manage that under Services) —
          there's no commission rate to configure here.
        </p>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <form onSubmit={submit} className="bg-white border rounded-lg p-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">
              Agent Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">
              Mobile <span className="text-red-500">*</span>
            </label>
            <input
              required
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.mobile ?? ""}
              onChange={(e) => set("mobile", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Alternate Mobile</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.altMobile ?? ""}
              onChange={(e) => set("altMobile", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">City</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.city ?? ""}
              onChange={(e) => set("city", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">State</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.state ?? ""}
              onChange={(e) => set("state", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm mb-1">Address</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm mb-1">Notes</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          <div className="col-span-2 border-t pt-4 mt-2">
            <label className="flex items-center gap-2 text-sm mb-3">
              <input
                type="checkbox"
                checked={createLogin}
                onChange={(e) => setCreateLogin(e.target.checked)}
              />
              Also create a portal login for this agent
            </label>
            {createLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">
                    Login ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    required={createLogin}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="e.g. rahul01"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    required={createLogin}
                    type="password"
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="col-span-2 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-slate-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Agent"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
