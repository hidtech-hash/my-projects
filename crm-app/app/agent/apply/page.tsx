"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AgentNav from "@/components/AgentNav";

const COMMON_DOCS = ["Aadhaar Card", "Photo", "Signature"];

export default function AgentApplyPage() {
  const router = useRouter();

  // Customer lookup-first flow
  const [mobile, setMobile] = useState("");
  const [checking, setChecking] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Record<string, string>>({});

  // Service + dynamic config
  const [services, setServices] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [serviceDetail, setServiceDetail] = useState<any>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [requirementFiles, setRequirementFiles] = useState<Record<string, File | null>>({});
  const [commonFiles, setCommonFiles] = useState<Record<string, File | null>>({});
  const [customDocs, setCustomDocs] = useState<{ name: string; file: File | null }[]>([]);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/agent-portal/services")
      .then((r) => r.json())
      .then((d) => setServices(d.services ?? []));
  }, []);

  useEffect(() => {
    if (!serviceId) {
      setServiceDetail(null);
      return;
    }
    fetch(`/api/agent-portal/services/${serviceId}`)
      .then((r) => r.json())
      .then((d) => setServiceDetail(d.service));
    setFieldValues({});
    setRequirementFiles({});
  }, [serviceId]);

  async function checkMobile() {
    if (!mobile.trim()) return;
    setChecking(true);
    setFoundCustomer(null);
    setNotFound(false);
    const res = await fetch(`/api/agent-portal/customers/lookup?mobile=${encodeURIComponent(mobile)}`);
    const data = await res.json();
    setChecking(false);
    if (data.customer) {
      setFoundCustomer(data.customer);
    } else {
      setNotFound(true);
      setNewCustomer({ mobile });
    }
  }

  async function submit() {
    setError("");
    if (!foundCustomer && !notFound) {
      setError("Enter a mobile number and check first.");
      return;
    }
    if (!serviceId || !serviceDetail) {
      setError("Select a service.");
      return;
    }
    if (notFound && (!newCustomer.fullName || !newCustomer.mobile)) {
      setError("New customer needs at least a name and mobile number.");
      return;
    }

    const missingFields = (serviceDetail.fields ?? [])
      .filter((f: any) => f.requiredAtSubmission)
      .filter((f: any) => !fieldValues[f.id]?.trim())
      .map((f: any) => f.label);
    if (missingFields.length > 0) {
      setError(`Missing required field(s): ${missingFields.join(", ")}`);
      return;
    }
    const missingDocs = (serviceDetail.documentRequirements ?? [])
      .filter((d: any) => d.required)
      .filter((d: any) => !requirementFiles[d.id])
      .map((d: any) => d.name);
    if (missingDocs.length > 0) {
      setError(`Missing required document(s): ${missingDocs.join(", ")}`);
      return;
    }

    setSubmitting(true);
    const form = new FormData();
    if (foundCustomer) {
      form.append("customerId", foundCustomer.id);
    } else {
      form.append("newCustomer", JSON.stringify(newCustomer));
    }
    form.append("serviceId", serviceId);
    form.append("fieldValues", JSON.stringify(fieldValues));
    for (const [reqId, file] of Object.entries(requirementFiles)) {
      if (file) form.append(`requirement_${reqId}`, file);
    }
    for (const [name, file] of Object.entries(commonFiles)) {
      if (file) form.append(`common_${name}`, file);
    }
    for (const doc of customDocs) {
      if (doc.name && doc.file) {
        form.append("customDocName", doc.name);
        form.append("customDocFile", doc.file);
      }
    }

    const res = await fetch("/api/agent-portal/applications", { method: "POST", body: form });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not submit application.");
      return;
    }
    router.push("/agent");
  }

  return (
    <div>
      <AgentNav />
      <main className="max-w-2xl mx-auto p-8 space-y-6">
        <h1 className="text-2xl font-semibold">Apply for Service</h1>

        {/* Step 1: customer */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-semibold mb-3">1. Customer</h2>
          {!foundCustomer && !notFound && (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs mb-1">Mobile Number</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>
              <button
                onClick={checkMobile}
                disabled={checking}
                className="bg-slate-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
              >
                {checking ? "Checking..." : "Check"}
              </button>
            </div>
          )}

          {foundCustomer && (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-sm flex items-center justify-between">
              <div>
                <p className="font-medium">Customer Found: {foundCustomer.fullName}</p>
                <p className="text-slate-500 text-xs">
                  {foundCustomer.customerCode} · {foundCustomer.mobile}
                </p>
              </div>
              <button
                onClick={() => {
                  setFoundCustomer(null);
                  setMobile("");
                }}
                className="text-blue-600 text-xs hover:underline"
              >
                Change
              </button>
            </div>
          )}

          {notFound && (
            <div className="space-y-3">
              <p className="text-sm text-amber-700">No customer found for {mobile} — add their details:</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Full Name *"
                  value={newCustomer.fullName ?? ""}
                  onChange={(e) => setNewCustomer({ ...newCustomer, fullName: e.target.value })}
                />
                <input
                  className="border rounded px-3 py-2 text-sm bg-slate-100"
                  value={newCustomer.mobile ?? mobile}
                  disabled
                />
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Email"
                  value={newCustomer.email ?? ""}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                />
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="District"
                  value={newCustomer.district ?? ""}
                  onChange={(e) => setNewCustomer({ ...newCustomer, district: e.target.value })}
                />
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="State"
                  value={newCustomer.state ?? ""}
                  onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                />
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="PIN Code"
                  value={newCustomer.pincode ?? ""}
                  onChange={(e) => setNewCustomer({ ...newCustomer, pincode: e.target.value })}
                />
              </div>
              <button
                onClick={() => {
                  setNotFound(false);
                  setMobile("");
                  setNewCustomer({});
                }}
                className="text-blue-600 text-xs hover:underline"
              >
                Change mobile number
              </button>
            </div>
          )}
        </div>

        {/* Step 2: service */}
        {(foundCustomer || notFound) && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="font-semibold mb-3">2. Service</h2>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="">Select a service...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — agent price ₹{Number(s.agentPrice)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step 3: dynamic fields */}
        {serviceDetail && serviceDetail.fields?.length > 0 && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="font-semibold mb-3">3. Service Information</h2>
            <div className="space-y-3">
              {serviceDetail.fields
                .filter((f: any) => f.visibleToAgent)
                .map((f: any) => (
                  <div key={f.id}>
                    <label className="block text-xs mb-1">
                      {f.label} {f.requiredAtSubmission && <span className="text-red-500">*</span>}
                      {!f.requiredAtSubmission && (
                        <span className="text-slate-400"> (can be added later if not available now)</span>
                      )}
                    </label>
                    {f.fieldType === "SELECT" ? (
                      <select
                        className="w-full border rounded px-3 py-2 text-sm"
                        value={fieldValues[f.id] ?? ""}
                        onChange={(e) => setFieldValues({ ...fieldValues, [f.id]: e.target.value })}
                      >
                        <option value="">Select...</option>
                        {(f.options ?? []).map((o: string) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : f.fieldType === "TEXTAREA" ? (
                      <textarea
                        className="w-full border rounded px-3 py-2 text-sm"
                        value={fieldValues[f.id] ?? ""}
                        onChange={(e) => setFieldValues({ ...fieldValues, [f.id]: e.target.value })}
                      />
                    ) : f.fieldType === "CHECKBOX" ? (
                      <input
                        type="checkbox"
                        checked={fieldValues[f.id] === "true"}
                        onChange={(e) => setFieldValues({ ...fieldValues, [f.id]: String(e.target.checked) })}
                      />
                    ) : (
                      <input
                        type={
                          f.fieldType === "DATE"
                            ? "date"
                            : f.fieldType === "EMAIL"
                            ? "email"
                            : f.fieldType === "PASSWORD"
                            ? "password"
                            : f.fieldType === "NUMBER"
                            ? "number"
                            : "text"
                        }
                        className="w-full border rounded px-3 py-2 text-sm"
                        value={fieldValues[f.id] ?? ""}
                        onChange={(e) => setFieldValues({ ...fieldValues, [f.id]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Step 4: required documents */}
        {serviceDetail && serviceDetail.documentRequirements?.length > 0 && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="font-semibold mb-3">4. Required Documents</h2>
            <div className="space-y-3">
              {serviceDetail.documentRequirements.map((d: any) => (
                <div key={d.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs mb-1">
                      {d.name} {d.required ? <span className="text-red-500">*</span> : <span className="text-slate-400">(optional)</span>}
                    </label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      className="w-full text-sm"
                      onChange={(e) =>
                        setRequirementFiles({ ...requirementFiles, [d.id]: e.target.files?.[0] ?? null })
                      }
                    />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${requirementFiles[d.id] ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {requirementFiles[d.id] ? "Uploaded" : d.required ? "Missing" : "Not uploaded"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: common optional documents */}
        {serviceDetail && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="font-semibold mb-3">5. Common Documents (optional)</h2>
            <div className="space-y-3">
              {COMMON_DOCS.map((name) => (
                <div key={name}>
                  <label className="block text-xs mb-1">{name}</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="w-full text-sm"
                    onChange={(e) => setCommonFiles({ ...commonFiles, [name]: e.target.files?.[0] ?? null })}
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t space-y-3">
              <p className="text-xs text-slate-500">Add any other document not listed above:</p>
              {customDocs.map((doc, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs mb-1">Document Name</label>
                    <input
                      className="w-full border rounded px-3 py-2 text-sm"
                      placeholder="e.g. Electricity Bill"
                      value={doc.name}
                      onChange={(e) => {
                        const next = [...customDocs];
                        next[i] = { ...next[i], name: e.target.value };
                        setCustomDocs(next);
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs mb-1">Upload</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      className="w-full text-sm"
                      onChange={(e) => {
                        const next = [...customDocs];
                        next[i] = { ...next[i], file: e.target.files?.[0] ?? null };
                        setCustomDocs(next);
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setCustomDocs(customDocs.filter((_, idx) => idx !== i))}
                    className="text-red-600 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => setCustomDocs([...customDocs, { name: "", file: null }])}
                className="text-blue-600 text-sm hover:underline"
              >
                + Add Document
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {serviceDetail && (
          <button
            onClick={submit}
            disabled={submitting}
            className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        )}
      </main>
    </div>
  );
}
