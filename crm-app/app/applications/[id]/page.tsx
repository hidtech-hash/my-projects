"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Nav from "@/components/Nav";

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

export default function ApplicationReviewPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const canDecide = role === "ADMIN" || role === "MANAGER" || role === "EMPLOYEE";

  const [data, setData] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldEdits, setFieldEdits] = useState<Record<string, string>>({});
  const [savingFields, setSavingFields] = useState(false);
  const [fieldsMessage, setFieldsMessage] = useState("");

  const load = useCallback(() => {
    fetch(`/api/customer-services/${params.id}`)
      .then((r) => r.json())
      .then(setData);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function accept() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/customer-services/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACCEPTED" }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error?.toString?.() || "Could not accept.");
      return;
    }
    load();
  }

  async function reject() {
    if (!rejectionReason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/customer-services/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED", rejectionReason }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error?.toString?.() || "Could not reject.");
      return;
    }
    setShowReject(false);
    setRejectionReason("");
    load();
  }

  async function saveFieldEdits() {
    if (Object.keys(fieldEdits).length === 0) return;
    setSavingFields(true);
    setFieldsMessage("");
    const res = await fetch(`/api/customer-services/${params.id}/fields`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldValues: fieldEdits }),
    });
    setSavingFields(false);
    if (!res.ok) {
      setFieldsMessage("Could not save field updates.");
      return;
    }
    setFieldEdits({});
    setFieldsMessage("Saved.");
    load();
  }


  if (!data?.application) {
    return (
      <div>
        <Nav />
        <main className="max-w-3xl mx-auto p-8 text-slate-400">Loading...</main>
      </div>
    );
  }

  const { application, activity } = data;
  const requiredDocs = application.service.documentRequirements ?? [];
  const uploadedByRequirement = new Set(application.documents.map((d: any) => d.requirementId).filter(Boolean));
  const commonOrCustomDocs = application.documents.filter((d: any) => !d.requirementId);
  const missingRequired = requiredDocs.filter((d: any) => d.required && !uploadedByRequirement.has(d.id));

  return (
    <div>
      <Nav />
      <main className="max-w-3xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {application.service.name}{" "}
            <span className="text-slate-400 font-normal text-lg">· {application.workCode}</span>
          </h1>
          <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${STATUS_COLORS[application.status] ?? "bg-slate-100"}`}>
            {application.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Accept/Reject action bar */}
        {canDecide && application.status === "PENDING_REVIEW" && (
          <div className="bg-white border rounded-lg p-6">
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            {missingRequired.length > 0 && (
              <p className="text-amber-700 text-sm mb-3">
                Missing required document(s): {missingRequired.map((d: any) => d.name).join(", ")}
              </p>
            )}
            {!showReject ? (
              <div className="flex gap-3">
                <button
                  onClick={accept}
                  disabled={saving}
                  className="bg-green-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  onClick={() => setShowReject(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded text-sm"
                >
                  Reject
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1">Rejection Reason</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="e.g. Aadhaar document is unclear"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={reject}
                    disabled={saving}
                    className="bg-red-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                  >
                    Confirm Reject
                  </button>
                  <button onClick={() => setShowReject(false)} className="text-slate-500 text-sm px-2">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {application.status === "REJECTED" && application.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
            <span className="font-medium text-red-800">Rejected: </span>
            <span className="text-red-700">{application.rejectionReason}</span>
          </div>
        )}

        {/* Customer + Agent info */}
        <div className="bg-white border rounded-lg p-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500 text-xs mb-1">Customer</p>
            <p className="font-medium">{application.customer.fullName}</p>
            <p className="text-slate-500">{application.customer.mobile}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">Agent</p>
            <p className="font-medium">{application.agent?.name ?? "Direct / walk-in"}</p>
            {application.agent && <p className="text-slate-500">{application.agent.agentCode}</p>}
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">Price</p>
            <p className="font-medium">₹{Number(application.amount ?? 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">Applied</p>
            <p className="font-medium">{new Date(application.appliedDate).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Dynamic field values */}
        {application.service.fields?.length > 0 && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="font-semibold mb-3">Submitted Information</h2>
            {fieldsMessage && <p className="text-xs text-blue-700 mb-3">{fieldsMessage}</p>}
            <div className="text-sm space-y-3">
              {application.service.fields.map((f: any) => {
                const v = application.fieldValues.find((fv: any) => fv.serviceFieldId === f.id);
                const currentValue = fieldEdits[f.id] ?? v?.value ?? "";
                if (!f.editableAfterSubmission) {
                  // Locked once submitted — read-only, per this field's
                  // own configuration (Service Configuration page).
                  return (
                    <p key={f.id}>
                      <span className="text-slate-500">{f.label}:</span>{" "}
                      {v?.value || <span className="text-slate-400">not provided</span>}
                    </p>
                  );
                }
                return (
                  <div key={f.id} className="flex items-center gap-3">
                    <label className="text-slate-500 w-56 shrink-0">{f.label}:</label>
                    <input
                      className="flex-1 border rounded px-2 py-1.5 text-sm"
                      placeholder={v?.value ? undefined : "not provided yet"}
                      value={currentValue}
                      onChange={(e) => setFieldEdits({ ...fieldEdits, [f.id]: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>
            {application.service.fields.some((f: any) => f.editableAfterSubmission) && (
              <button
                onClick={saveFieldEdits}
                disabled={savingFields || Object.keys(fieldEdits).length === 0}
                className="mt-4 bg-slate-900 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
              >
                {savingFields ? "Saving..." : "Save Field Updates"}
              </button>
            )}
          </div>
        )}

        {/* Documents checklist */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-semibold mb-3">Documents</h2>
          <div className="space-y-2 text-sm">
            {requiredDocs.map((d: any) => {
              const doc = application.documents.find((ad: any) => ad.requirementId === d.id);
              return (
                <div key={d.id} className="flex items-center justify-between">
                  <span>
                    {d.name} <span className="text-xs text-slate-400">({d.required ? "Required" : "Optional"})</span>
                  </span>
                  {doc ? (
                    <a href={doc.fileUrl} target="_blank" className="text-blue-600 text-xs hover:underline">
                      View
                    </a>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded ${d.required ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                      Missing
                    </span>
                  )}
                </div>
              );
            })}
            {commonOrCustomDocs.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between">
                <span>{d.documentName} <span className="text-xs text-slate-400">(additional)</span></span>
                <a href={d.fileUrl} target="_blank" className="text-blue-600 text-xs hover:underline">
                  View
                </a>
              </div>
            ))}
            {requiredDocs.length === 0 && commonOrCustomDocs.length === 0 && (
              <p className="text-slate-400 text-sm">No documents on this application.</p>
            )}
          </div>
        </div>

        {/* Activity history */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-semibold mb-3">History</h2>
          <div className="space-y-1 text-sm">
            {activity.length === 0 && <p className="text-slate-400">No activity yet.</p>}
            {activity.map((a: any) => (
              <p key={a.id} className="text-slate-600">
                <span className="text-slate-400">{new Date(a.createdAt).toLocaleString()} · </span>
                {a.user.name} — {a.action.replace(/_/g, " ").toLowerCase()}
              </p>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
