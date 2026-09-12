"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const canAssign = role === "ADMIN" || role === "MANAGER";
  const canManagePayments = role === "ADMIN" || role === "MANAGER";

  const [data, setData] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
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
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d) => setAgents(d.agents ?? []));
    fetch("/api/employees")
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees ?? []));
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
              agents={agents}
              employees={employees}
              canAssign={canAssign}
              canManagePayments={canManagePayments}
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
                    agents={agents}
                    employees={employees}
                    canAssign={canAssign}
                    canManagePayments={canManagePayments}
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
                        {cs.amount != null && (
                          <span className="text-slate-400 font-normal"> · ₹{Number(cs.amount).toLocaleString()}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Applied {new Date(cs.appliedDate).toLocaleDateString()}
                        {cs.referenceNumber && <> · Ref: {cs.referenceNumber}</>}
                        {cs.agent && <> · Agent: {cs.agent.name}</>}
                        {cs.assignedEmployee && <> · Assigned: {cs.assignedEmployee.name}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[cs.status] ?? "bg-slate-100"}`}
                      >
                        {cs.status.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          cs.paymentStatus === "PAID"
                            ? "bg-green-100 text-green-700"
                            : cs.paymentStatus === "PARTIAL"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        Payment: {cs.paymentStatus}
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
  agents,
  employees,
  canAssign,
  canManagePayments,
  onDone,
  onCancel,
}: {
  customerId: string;
  services: any[];
  agents: any[];
  employees: any[];
  canAssign: boolean;
  canManagePayments: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [serviceId, setServiceId] = useState("");
  const [notes, setNotes] = useState("");
  const [agentId, setAgentId] = useState("");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [amountOverride, setAmountOverride] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId);
  // The price the system will use, purely for display before saving —
  // agent price if an agent is selected, otherwise the normal customer
  // price. This is exactly what the backend computes too.
  const autoPrice = selectedService
    ? agentId
      ? Number(selectedService.agentPrice)
      : Number(selectedService.customerPrice)
    : null;

  async function submit() {
    if (!serviceId) return;
    setSaving(true);
    await fetch("/api/customer-services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        serviceId,
        notes: notes || undefined,
        agentId: agentId || undefined,
        assignedEmployeeId: assignedEmployeeId || undefined,
        amount: canManagePayments && amountOverride !== "" ? Number(amountOverride) : undefined,
      }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="bg-slate-50 border rounded p-4 mb-4 space-y-3">
      <div className="flex items-end gap-3">
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
                {s.name} (₹{Number(s.customerPrice)} / agent ₹{Number(s.agentPrice)})
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs mb-1">Received From Agent (optional)</label>
          <select
            className="w-full border rounded px-2 py-1.5 text-sm"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          >
            <option value="">Direct / walk-in customer</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.agentCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {autoPrice !== null && (
        <p className="text-xs text-slate-500">
          Price to be charged:{" "}
          <span className="font-medium text-slate-700">
            ₹{(canManagePayments && amountOverride !== "" ? Number(amountOverride) : autoPrice).toLocaleString()}
          </span>{" "}
          {agentId ? "(agent price)" : "(customer price)"}
          {canManagePayments && (
            <>
              {" — "}
              <input
                placeholder="override ₹"
                className="w-24 border rounded px-1.5 py-0.5 text-xs ml-1"
                value={amountOverride}
                onChange={(e) => setAmountOverride(e.target.value)}
              />
            </>
          )}
        </p>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs mb-1">Notes</label>
          <input
            className="w-full border rounded px-2 py-1.5 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {canAssign && (
          <div className="flex-1">
            <label className="block text-xs mb-1">Assign To Employee (optional)</label>
            <select
              className="w-full border rounded px-2 py-1.5 text-sm"
              value={assignedEmployeeId}
              onChange={(e) => setAssignedEmployeeId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-3">
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
    </div>
  );
}

function EditServiceForm({
  cs,
  agents,
  employees,
  canAssign,
  canManagePayments,
  onDone,
  onCancel,
}: {
  cs: any;
  agents: any[];
  employees: any[];
  canAssign: boolean;
  canManagePayments: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState(cs.status);
  const [referenceNumber, setReferenceNumber] = useState(cs.referenceNumber ?? "");
  const [notes, setNotes] = useState(cs.notes ?? "");
  const [agentId, setAgentId] = useState(cs.agentId ?? "");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState(cs.assignedEmployeeId ?? "");
  const [amount, setAmount] = useState(cs.amount ?? "");
  const [amountReceived, setAmountReceived] = useState(cs.amountReceived ?? "");
  const [paymentStatus, setPaymentStatus] = useState(cs.paymentStatus ?? "PENDING");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    const body: Record<string, unknown> = {
      status,
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined,
      completedDate: status === "COMPLETED" ? new Date().toISOString() : undefined,
    };
    // Agent link + assignment: allowed at this permission tier (see
    // component props); reassigning to someone else is still
    // enforced server-side as admin/manager-only.
    body.agentId = agentId || null;
    body.assignedEmployeeId = assignedEmployeeId || null;
    if (canManagePayments) {
      body.amount = amount !== "" ? Number(amount) : undefined;
      body.amountReceived = amountReceived !== "" ? Number(amountReceived) : undefined;
      body.paymentStatus = paymentStatus;
    }
    await fetch(`/api/customer-services/${cs.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

      <div className="grid grid-cols-2 gap-3 mb-3 pt-3 border-t">
        <div>
          <label className="block text-xs mb-1">Agent</label>
          <select
            className="w-full border rounded px-2 py-1.5 text-sm"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          >
            <option value="">Direct / walk-in</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.agentCode})
              </option>
            ))}
          </select>
        </div>
        {canAssign && (
          <div>
            <label className="block text-xs mb-1">Assigned Employee</label>
            <select
              className="w-full border rounded px-2 py-1.5 text-sm"
              value={assignedEmployeeId}
              onChange={(e) => setAssignedEmployeeId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {canManagePayments && (
        <div className="grid grid-cols-3 gap-3 mb-3 pt-3 border-t">
          <div>
            <label className="block text-xs mb-1">Price (₹)</label>
            <input
              className="w-full border rounded px-2 py-1.5 text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Amount Received (₹)</label>
            <input
              className="w-full border rounded px-2 py-1.5 text-sm"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Payment Status</label>
            <select
              className="w-full border rounded px-2 py-1.5 text-sm"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="PENDING">Pending</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </div>
      )}

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
