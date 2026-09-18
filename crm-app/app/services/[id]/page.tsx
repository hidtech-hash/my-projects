"use client";

import { useEffect, useState, useCallback } from "react";
import Nav from "@/components/Nav";

const FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "EMAIL", "PHONE", "PASSWORD", "TEXTAREA", "SELECT", "CHECKBOX"];

export default function ServiceConfigPage({ params }: { params: { id: string } }) {
  const [service, setService] = useState<any>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/services/${params.id}`)
      .then((r) => r.json())
      .then((d) => setService(d.service));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteField(fieldId: string) {
    await fetch(`/api/services/${params.id}/fields/${fieldId}`, { method: "DELETE" });
    load();
  }
  async function deleteDoc(docId: string) {
    await fetch(`/api/services/${params.id}/documents/${docId}`, { method: "DELETE" });
    load();
  }

  if (!service) {
    return (
      <div>
        <Nav />
        <main className="max-w-3xl mx-auto p-8 text-slate-400">Loading...</main>
      </div>
    );
  }

  return (
    <div>
      <Nav />
      <main className="max-w-3xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">{service.name}</h1>
          <p className="text-sm text-slate-500">
            Customer Price ₹{Number(service.customerPrice)} · Agent Price ₹{Number(service.agentPrice)}
          </p>
        </div>

        {/* Dynamic fields */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Application Fields</h2>
              <p className="text-xs text-slate-500 mt-1">
                These render automatically on the Agent's Apply for Service form and the staff review
                screen — no code changes needed to add a new field.
              </p>
            </div>
            <button
              onClick={() => setShowAddField(true)}
              className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm"
            >
              + Add Field
            </button>
          </div>

          {showAddField && (
            <AddFieldForm
              serviceId={params.id}
              onDone={() => {
                setShowAddField(false);
                load();
              }}
              onCancel={() => setShowAddField(false)}
            />
          )}

          <div className="divide-y">
            {service.fields.length === 0 && <p className="text-slate-400 text-sm py-3">No fields configured.</p>}
            {service.fields.map((f: any) => (
              <div key={f.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{f.label}</span>{" "}
                  <span className="text-slate-400">({f.fieldType.toLowerCase()})</span>
                  {f.requiredAtSubmission && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                      Required at submission
                    </span>
                  )}
                  {!f.requiredAtSubmission && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      Optional / can be added later
                    </span>
                  )}
                </div>
                <button onClick={() => deleteField(f.id)} className="text-red-600 text-xs hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Document requirements */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Document Requirements</h2>
              <p className="text-xs text-slate-500 mt-1">
                The Agent's upload form and the staff review checklist are generated from this list.
              </p>
            </div>
            <button
              onClick={() => setShowAddDoc(true)}
              className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm"
            >
              + Add Document
            </button>
          </div>

          {showAddDoc && (
            <AddDocForm
              serviceId={params.id}
              onDone={() => {
                setShowAddDoc(false);
                load();
              }}
              onCancel={() => setShowAddDoc(false)}
            />
          )}

          <div className="divide-y">
            {service.documentRequirements.length === 0 && (
              <p className="text-slate-400 text-sm py-3">No document requirements configured.</p>
            )}
            {service.documentRequirements.map((d: any) => (
              <div key={d.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{d.name}</span>
                  <span
                    className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      d.required ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {d.required ? "Required" : "Optional"}
                  </span>
                </div>
                <button onClick={() => deleteDoc(d.id)} className="text-red-600 text-xs hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function AddFieldForm({ serviceId, onDone, onCancel }: { serviceId: string; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState("TEXT");
  const [options, setOptions] = useState("");
  const [requiredAtSubmission, setRequiredAtSubmission] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/services/${serviceId}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim().toLowerCase().replace(/\s+/g, "_"),
        label,
        fieldType,
        options: fieldType === "SELECT" ? options.split(",").map((o) => o.trim()).filter(Boolean) : undefined,
        requiredAtSubmission,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error?.toString?.() || "Could not add field.");
      return;
    }
    onDone();
  }

  return (
    <div className="bg-slate-50 border rounded p-4 mb-4 space-y-3">
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1">Field Label</label>
          <input
            className="w-full border rounded px-2 py-1.5 text-sm"
            placeholder="e.g. ARN"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (!name) setName(e.target.value);
            }}
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Field Type</label>
          <select
            className="w-full border rounded px-2 py-1.5 text-sm"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value)}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      {fieldType === "SELECT" && (
        <div>
          <label className="block text-xs mb-1">Options (comma-separated)</label>
          <input
            className="w-full border rounded px-2 py-1.5 text-sm"
            placeholder="Fresh, Renewal, Correction"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
          />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={requiredAtSubmission}
          onChange={(e) => setRequiredAtSubmission(e.target.checked)}
        />
        Required when the Agent submits (leave unchecked for info that can be added later)
      </label>
      <div className="flex gap-3">
        <button
          onClick={submit}
          disabled={saving || !label}
          className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
        >
          {saving ? "Saving..." : "Add Field"}
        </button>
        <button onClick={onCancel} className="text-slate-500 text-sm px-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddDocForm({ serviceId, onDone, onCancel }: { serviceId: string; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [required, setRequired] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/services/${serviceId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, required }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error?.toString?.() || "Could not add document requirement.");
      return;
    }
    onDone();
  }

  return (
    <div className="bg-slate-50 border rounded p-4 mb-4 space-y-3">
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs mb-1">Document Name</label>
          <input
            className="w-full border rounded px-2 py-1.5 text-sm"
            placeholder="e.g. Aadhaar Card"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          Required
        </label>
      </div>
      <div className="flex gap-3">
        <button
          onClick={submit}
          disabled={saving || !name}
          className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
        >
          {saving ? "Saving..." : "Add Document"}
        </button>
        <button onClick={onCancel} className="text-slate-500 text-sm px-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
