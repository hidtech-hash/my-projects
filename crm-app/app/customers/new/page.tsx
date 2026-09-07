"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

const FIELDS: Array<{ name: string; label: string; type?: string; required?: boolean }> = [
  { name: "fullName", label: "Full Name", required: true },
  { name: "mobile", label: "Mobile Number", required: true },
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
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function submit(confirmDuplicate = false) {
    setLoading(true);
    setError("");
    const dob = form.dob ? new Date(form.dob).toISOString() : undefined;
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, dob, confirmDuplicate }),
    });
    setLoading(false);

    if (res.status === 409) {
      const data = await res.json();
      setDuplicate(data.existingCustomer);
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

        {duplicate && (
          <div className="bg-amber-50 border border-amber-300 rounded p-4 mb-6 text-sm">
            <p className="font-medium mb-1">A customer with this mobile number already exists:</p>
            <p>
              {duplicate.customerCode} — {duplicate.fullName} ({duplicate.mobile})
            </p>
            <div className="flex gap-3 mt-3">
              <a href={`/customers/${duplicate.id}`} className="underline text-blue-700">
                View existing customer
              </a>
              <button
                onClick={() => submit(true)}
                className="underline text-amber-800"
                disabled={loading}
              >
                Create a new customer anyway
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(false);
          }}
          className="bg-white border rounded-lg p-6 grid grid-cols-2 gap-4"
        >
          {FIELDS.map((f) => (
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
          <div className="col-span-2 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-slate-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
