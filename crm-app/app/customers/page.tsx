"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";

type Customer = {
  id: string;
  customerCode: string;
  fullName: string;
  mobile: string;
  district: string | null;
  _count: { services: number };
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/customers?search=${encodeURIComponent(search)}`)
        .then((r) => r.json())
        .then((data) => setCustomers(data.customers ?? []))
        .finally(() => setLoading(false));
    }, 300); // debounce
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div>
      <Nav />
      <main className="max-w-5xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Customers</h1>
          <Link href="/customers/new" className="bg-slate-900 text-white px-4 py-2 rounded text-sm">
            + Add Customer
          </Link>
        </div>

        <input
          className="w-full border rounded px-3 py-2 mb-6"
          placeholder="Search by name, mobile, or customer ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-4 py-2">Customer ID</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Mobile</th>
                <th className="px-4 py-2">District</th>
                <th className="px-4 py-2">Applied Services</th>
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
              {!loading && customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No customers found.
                  </td>
                </tr>
              )}
              {customers.map((c) => (
                <tr key={c.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/customers/${c.id}`} className="text-blue-600 hover:underline">
                      {c.customerCode}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{c.fullName}</td>
                  <td className="px-4 py-2">{c.mobile}</td>
                  <td className="px-4 py-2">{c.district ?? "-"}</td>
                  <td className="px-4 py-2">{c._count.services}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
