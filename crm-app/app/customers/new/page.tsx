"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

const REST_OF_FIELDS: Array<{ name: string; label: string; type?: string; required?: boolean }> = [
  { name: "fullName", label: "Full Name", required: true },
  { name: "altMobile", label: "Alternate Mobile" },
  { name: "email", label: "Email", type: "email" },
  { name: "address", label: "Address" },
  { name: "village", label: "Village" },
  { name: "tehsil", label: "Tehsil" },
  { name: "district", label: "District" },
  { name: "state", label: "State" },
  { name: "pincode", label: "PIN Code" },
  { name: "dob", label: "Date of Birth", type: "date" },
  { name: "gender", label: "Gender" },
  { name: "notes", label: "Notes" },
];

export default function NewCustomerPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [checking, setChecking] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkMobile() {
    if (!mobile.trim()) return;
    setChecking(true);
    setFoundCustomer(null);
    setShowForm(false);
    const res = await fetch(`/api/customers/lookup?mobile=${encodeURIComponent(mobile)}`);
    const data = await res.json();
    setChecking(false);
    if (data.customer) {
      setFoundCustomer(data.customer);
    } else {
      setShowForm(true);
    }
  }

  async function submit() {
    setLoading(true);
    setError("");
    const dob = form.dob ? new Date(form.dob).toISOString() : undefined;
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, mobile, dob }),
    });
    setLoading(false);
    if (res.status === 409) {
      // Race condition: someone else created this mobile number
      // between our lookup and submit — show it instead of erroring.
      const data = await res.json();
      setFoundCustomer(data.existingCustomer);
      setShowForm(false);
      return;
    }
    if (!res.ok) {
      setError("Could not create customer. Check the required fields.");
      return;
    }
    const data = await res.json();
    router.push(`/customers/${data.customer.id}`);
  }

  return (
    <div>
      <Nav />
      <main className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-6">Add Customer</h1>

        {/* Step 1: mobile-first lookup */}
        {!foundCustomer && !showForm && (
          <div className="bg-white border rounded-lg p-6 flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkMobile()}
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <p className="font-medium mb-1">Customer Found</p>
            <p className="text-sm text-slate-700 mb-4">
              {foundCustomer.customerCode} — {foundCustomer.fullName} ({foundCustomer.mobile})
            </p>
            <div className="flex gap-4">
              <a href={`/customers/${foundCustomer.id}`} className="bg-slate-900 text-white px-4 py-2 rounded text-sm">
                Open Customer Profile
              </a>
              <button
                onClick={() => {
                  setFoundCustomer(null);
                  setMobile("");
                }}
                className="text-slate-600 text-sm underline"
              >
                Search a different number
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <>
            <p className="text-sm text-amber-700 mt-4 mb-3">
              No customer found for {mobile} — continue with new customer details:
            </p>
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="bg-white border rounded-lg p-6 grid grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm mb-1">Mobile Number</label>
                <input className="w-full border rounded px-3 py-2 text-sm bg-slate-100" value={mobile} disabled />
              </div>
              <div />
              {REST_OF_FIELDS.map((f) => (
                <div key={f.name} className={f.name === "notes" || f.name === "address" ? "col-span-2" : ""}>
                  <label className="block text-sm mb-1">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={f.type ?? "text"}
                    required={f.required}
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={form[f.name] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                </div>
              ))}
              <div className="col-span-2 mt-2 flex items-center gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-slate-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Customer"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setMobile("");
                    setForm({});
                  }}
                  className="text-slate-500 text-sm"
                >
                  Change mobile number
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
