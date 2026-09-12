"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Nav from "@/components/Nav";

type Service = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  customerPrice: number;
  agentPrice: number;
  isActive: boolean;
};

export default function ServicesPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const canManage = role === "ADMIN" || role === "MANAGER";

  const [services, setServices] = useState<Service[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/services?all=1")
      .then((r) => r.json())
      .then((d) => setServices(d.services ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(s: Service) {
    await fetch(`/api/services/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    load();
  }

  return (
    <div>
      <Nav />
      <main className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold">Services</h1>
          {canManage && (
            <Link href="/services/new" className="bg-slate-900 text-white px-4 py-2 rounded text-sm">
              + Add Service
            </Link>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Every service has two fixed prices — what a normal customer pays, and the fixed
          discounted rate used automatically when the work comes through an agent. No
          commission math anywhere: the agent price IS the price.
        </p>

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Customer Price</th>
                <th className="px-4 py-2">Agent Price</th>
                <th className="px-4 py-2">Status</th>
                {canManage && <th className="px-4 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && services.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No services yet.
                  </td>
                </tr>
              )}
              {services.map((s) =>
                editingId === s.id ? (
                  <EditRow key={s.id} service={s} onDone={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
                ) : (
                  <tr key={s.id} className={`border-t ${!s.isActive ? "opacity-50" : ""}`}>
                    <td className="px-4 py-2">
                      <p className="font-medium">{s.name}</p>
                      {s.description && <p className="text-xs text-slate-500">{s.description}</p>}
                    </td>
                    <td className="px-4 py-2">₹{Number(s.customerPrice).toLocaleString()}</td>
                    <td className="px-4 py-2">₹{Number(s.agentPrice).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          s.isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-2 space-x-3">
                        <button onClick={() => setEditingId(s.id)} className="text-blue-600 text-xs hover:underline">
                          Edit
                        </button>
                        <button onClick={() => toggleActive(s)} className="text-slate-600 text-xs hover:underline">
                          {s.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    )}
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

function EditRow({ service, onDone, onCancel }: { service: Service; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState(service.name);
  const [customerPrice, setCustomerPrice] = useState(String(service.customerPrice));
  const [agentPrice, setAgentPrice] = useState(String(service.agentPrice));
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await fetch(`/api/services/${service.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        customerPrice: Number(customerPrice),
        agentPrice: Number(agentPrice),
      }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <tr className="border-t bg-slate-50">
      <td className="px-4 py-2">
        <input className="w-full border rounded px-2 py-1 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td className="px-4 py-2">
        <input className="w-24 border rounded px-2 py-1 text-sm" value={customerPrice} onChange={(e) => setCustomerPrice(e.target.value)} />
      </td>
      <td className="px-4 py-2">
        <input className="w-24 border rounded px-2 py-1 text-sm" value={agentPrice} onChange={(e) => setAgentPrice(e.target.value)} />
      </td>
      <td className="px-4 py-2"></td>
      <td className="px-4 py-2 space-x-3">
        <button onClick={submit} disabled={saving} className="text-blue-600 text-xs hover:underline">
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={onCancel} className="text-slate-500 text-xs hover:underline">
          Cancel
        </button>
      </td>
    </tr>
  );
}
