"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AgentNav from "@/components/AgentNav";

const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-300 text-slate-700",
};

export default function AgentApplicationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [requirementFiles, setRequirementFiles] = useState<Record<string, File | null>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/agent-portal/applications/${params.id}`)
      .then((r) => r.json())
      .then(setData);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function resubmit() {
    setSubmitting(true);
    setError("");
    const form = new FormData();
    form.append("fieldValues", JSON.stringify(fieldValues));
    for (const [reqId, file] of Object.entries(requirementFiles)) {
      if (file) form.append(`requirement_${reqId}`, file);
    }
    const res = await fetch(`/api/agent-portal/applications/${params.id}/resubmit`, {
      method: "PUT",
      body: form,
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not resubmit.");
      return;
    }
    router.push("/agent");
  }

  async function cancelApplication() {
    if (!confirm("Cancel this application? This cannot be undone.")) return;
    await fetch(`/api/agent-portal/applications/${params.id}/cancel`, { method: "PUT" });
    router.push("/agent");
  }

  if (!data?.application) {
    return (
      <div>
        <AgentNav />
        <main className="max-w-2xl mx-auto p-8 text-slate-400">Loading...</main>
      </div>
    );
  }

  const { application } = data;
  const existingDocs = application.documents ?? [];
  const satisfiedRequirementIds = new Set(existingDocs.map((d: any) => d.requirementId).filter(Boolean));

  return (
    <div>
      <AgentNav />
      <main className="max-w-2xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {application.service.name} <span className="text-slate-400 font-normal text-lg">· {application.workCode}</span>
          </h1>
          <p className="text-slate-500 text-sm">{application.customer.fullName}</p>
          <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${STATUS_COLORS[application.status] ?? "bg-slate-100"}`}>
            {application.status.replace(/_/g, " ")}
          </span>
        </div>

        {application.status === "REJECTED" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="font-medium text-sm text-red-800">Rejection Reason</p>
            <p className="text-sm text-red-700 mt-1">{application.rejectionReason || "No reason given."}</p>
          </div>
        )}

        {application.status === "REJECTED" && (
          <div className="bg-white border rounded-lg p-6 space-y-4">
            <h2 className="font-semibold">Correct and Resubmit</h2>
            {error && <p className="text-red-600 text-sm">{error}</p>}

            {application.service.fields?.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Update any field information:</p>
                {application.service.fields.map((f: any) => {
                  const existingValue = application.fieldValues.find((v: any) => v.serviceFieldId === f.id)?.value ?? "";
                  return (
                    <div key={f.id}>
                      <label className="block text-xs mb-1">
                        {f.label} {f.requiredAtSubmission && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        className="w-full border rounded px-3 py-2 text-sm"
                        defaultValue={existingValue}
                        onChange={(e) => setFieldValues({ ...fieldValues, [f.id]: e.target.value })}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {application.service.documentRequirements?.length > 0 && (
              <div className="space-y-3 pt-3 border-t">
                <p className="text-xs text-slate-500">Re-upload or add missing documents:</p>
                {application.service.documentRequirements.map((d: any) => {
                  const satisfied = satisfiedRequirementIds.has(d.id) || requirementFiles[d.id];
                  return (
                    <div key={d.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-xs mb-1">
                          {d.name} {d.required && <span className="text-red-500">*</span>}
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
                      <span className={`text-xs px-2 py-1 rounded ${satisfied ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {satisfied ? "Uploaded" : "Missing"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={resubmit}
                disabled={submitting}
                className="bg-slate-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Resubmit Application"}
              </button>
              <button onClick={cancelApplication} className="bg-red-600 text-white px-4 py-2 rounded text-sm">
                Cancel Application
              </button>
            </div>
          </div>
        )}

        {/* Field values (read view for non-rejected states) */}
        {application.status !== "REJECTED" && application.fieldValues.length > 0 && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="font-semibold mb-3">Submitted Information</h2>
            <div className="text-sm space-y-1">
              {application.fieldValues.map((v: any) => {
                const field = application.service.fields.find((f: any) => f.id === v.serviceFieldId);
                return (
                  <p key={v.id}>
                    <span className="text-slate-500">{field?.label ?? "Field"}:</span> {v.value}
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {/* Documents */}
        {existingDocs.length > 0 && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="font-semibold mb-3">Documents</h2>
            <div className="space-y-1 text-sm">
              {existingDocs.map((d: any) => (
                <a key={d.id} href={d.fileUrl} target="_blank" className="block text-blue-600 hover:underline">
                  {d.documentName}
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
