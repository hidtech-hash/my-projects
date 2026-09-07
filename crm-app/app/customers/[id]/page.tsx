"use client";

import { useEffect, useState, useCallback } from "react";
import Nav from "@/components/Nav";

const STATUS_OPTIONS = [
  "NEW",
  "ASSIGNED",
  "PROCESSING",
  "DOCUMENT_REQUIRED",
  "SUBMITTED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-slate-200 text-slate-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-amber-100 text-amber-700",
  DOCUMENT_REQUIRED: "bg-orange-100 text-orange-700",
  SUBMITTED: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-300 text-slate-700",
};

export default function CustomerProfilePage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [showApply, setShowApply] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/customers/${params.id}`)
      .then((r) => r.json())
      .then(setData);
  }, [params.id]);

  useEffect(() => {
    load();
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => setServices(d.services ?? []));
  }, [load]);

  if (!data?.customer) {
    return (
      <div>
        <Nav />
        <main className="max-w-4xl mx-auto p-8 text-slate-400">Loading...</main>
      </div>
    );
  }

  const { customer, activity } = data;

  return (
    <div>
      <Nav />
      <main className="max-w-4xl mx-auto p-8 space-y-8">
        {/* Customer info */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold">{customer.fullName}</h1>
              <p className="text-slate-500 text-sm">
                {customer.customerCode} · {customer.mobile}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm text-slate-600">
            <div>Email: {customer.email ?? "-"}</div>
            <div>District: {customer.district ?? "-"}</div>
            <div>State: {customer.state ?? "-"}</div>
          </div>
        </div>

        {/* Applied services */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Applied Services</h2>
            <button
              onClick={() => setShowApply(true)}
              className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm"
            >
              + Apply Service
            </button>
          </div>

          {showApply && (
            <ApplyServiceForm
              customerId={customer.id}
              services={services}
              onDone={() => {
                setShowApply(false);
                load();
              }}
              onCancel={() => setShowApply(false)}
            />
          )}

          <div className="divide-y">
            {customer.services.length === 0 && (
              <p className="text-slate-400 text-sm py-4">No services applied yet.</p>
            )}
            {customer.services.map((cs: any) => (
              <div key={cs.id} className="py-3">
                {editingId === cs.id ? (
                  <EditServiceForm
                    cs={cs}
                    onDone={() => {
                      setEditingId(null);
                      load();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {cs.service.name}{" "}
                        <span className="text-slate-400 font-normal">· {cs.workCode}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Applied {new Date(cs.appliedDate).toLocaleDateString()}
                        {cs.referenceNumber && <> · Ref: {cs.referenceNumber}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[cs.status] ?? "bg-slate-100"}`}
                      >
                        {cs.status.replace(/_/g, " ")}
                      </span>
                      <button
                        onClick={() => setEditingId(cs.id)}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Activity log */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Activity History</h2>
          <div className="space-y-2 text-sm">
            {activity?.length === 0 && <p className="text-slate-400">No activity yet.</p>}
            {activity?.map((a: any) => (
              <div key={a.id} className="text-slate-600">
                <span className="text-slate-400">
                  {new Date(a.createdAt).toLocaleString()} ·{" "}
                </span>
                {a.user.name} — {a.action.replace(/_/g, " ").toLowerCase()}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function ApplyServiceForm({
  customerId,
  services,
  onDone,
  onCancel,
}: {
  customerId: string;
  services: any[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [serviceId, setServiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!serviceId) return;
    setSaving(true);
    await fetch("/api/customer-services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        serviceId,
        amount: amount ? Number(amount) : undefined,
        notes: notes || undefined,
      }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="bg-slate-50 border rounded p-4 mb-4 flex items-end gap-3">
      <div className="flex-1">
        <label className="block text-xs mb-1">Service</label>
        <select
          className="w-full border rounded px-2 py-1.5 text-sm"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        >
          <option value="">Select a service...</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs mb-1">Amount</label>
        <input
          className="w-28 border rounded px-2 py-1.5 text-sm"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="flex-1">
        <label className="block text-xs mb-1">Notes</label>
        <input
          className="w-full border rounded px-2 py-1.5 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <button
        onClick={submit}
        disabled={saving || !serviceId}
        className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
      >
        {saving ? "Saving..." : "Add"}
      </button>
      <button onClick={onCancel} className="text-slate-500 text-sm px-2">
        Cancel
      </button>
    </div>
  );
}

function EditServiceForm({ cs, onDone, onCancel }: { cs: any; onDone: () => void; onCancel: () => void }) {
  const [status, setStatus] = useState(cs.status);
  const [referenceNumber, setReferenceNumber] = useState(cs.referenceNumber ?? "");
  const [notes, setNotes] = useState(cs.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await fetch(`/api/customer-services/${cs.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
        completedDate: status === "COMPLETED" ? new Date().toISOString() : undefined,
      }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="bg-slate-50 border rounded p-4">
      <p className="font-medium text-sm mb-3">
        {cs.service.name} <span className="text-slate-400 font-normal">· {cs.workCode}</span>
      </p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs mb-1">Status</label>
          <select
            className="w-full border rounded px-2 py-1.5 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1">Reference Number</label>
          <input
            className="w-full border rounded px-2 py-1.5 text-sm"
            placeholder="e.g. online application ref no."
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-xs mb-1">Notes</label>
        <input
          className="w-full border rounded px-2 py-1.5 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={onCancel} className="text-slate-500 text-sm px-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
