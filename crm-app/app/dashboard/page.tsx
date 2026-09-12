"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";

export default function DashboardPage() {
  const [myWork, setMyWork] = useState<any>(null);

  useEffect(() => {
    fetch("/api/dashboard/my-work")
      .then((r) => r.json())
      .then(setMyWork);
  }, []);

  return (
    <div>
      <Nav />
      <main className="max-w-5xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
          <p className="text-slate-600">
            <Link href="/customers" className="text-blue-600 hover:underline">
              Customers
            </Link>{" "}
            ·{" "}
            <Link href="/agents" className="text-blue-600 hover:underline">
              Agents
            </Link>
          </p>
        </div>

        {myWork && (
          <>
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Assigned to Me" value={myWork.counts.totalAssigned} />
              <StatCard label="Pending / In Progress" value={myWork.counts.pending} tone="amber" />
              <StatCard
                label="Needs Reference No."
                value={myWork.counts.needsReference}
                tone="red"
              />
              <StatCard label="Org-wide Unassigned" value={myWork.counts.unassigned} tone="amber" />
            </div>

            {myWork.unassigned.length > 0 && (
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="px-6 pt-6 pb-4">
                  <h2 className="font-semibold">Unassigned Queue</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Applications nobody has been assigned yet — visible to Admin/Manager only.
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left">
                    <tr>
                      <th className="px-4 py-2">Work ID</th>
                      <th className="px-4 py-2">Customer</th>
                      <th className="px-4 py-2">Service</th>
                      <th className="px-4 py-2">Agent</th>
                      <th className="px-4 py-2">Applied</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {myWork.unassigned.map((cs: any) => (
                      <tr key={cs.id} className="border-t">
                        <td className="px-4 py-2">{cs.workCode}</td>
                        <td className="px-4 py-2">{cs.customer.fullName}</td>
                        <td className="px-4 py-2">{cs.service.name}</td>
                        <td className="px-4 py-2">{cs.agent?.name ?? "-"}</td>
                        <td className="px-4 py-2">{new Date(cs.appliedDate).toLocaleDateString()}</td>
                        <td className="px-4 py-2">
                          <Link
                            href={`/customers/${cs.customer.id}`}
                            className="text-blue-600 text-xs hover:underline"
                          >
                            Assign →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-6 pt-6 pb-4">
                <h2 className="font-semibold">Incomplete Applications</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Assigned to you, not yet completed, and missing an online application
                  reference number.
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="px-4 py-2">Work ID</th>
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-4 py-2">Service</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Applied</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {myWork.needsReference.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                        Nothing pending — all your assigned applications have a reference
                        number or are complete.
                      </td>
                    </tr>
                  )}
                  {myWork.needsReference.map((cs: any) => (
                    <tr key={cs.id} className="border-t">
                      <td className="px-4 py-2">{cs.workCode}</td>
                      <td className="px-4 py-2">
                        {cs.customer.fullName}{" "}
                        <span className="text-slate-400">· {cs.customer.mobile}</span>
                      </td>
                      <td className="px-4 py-2">{cs.service.name}</td>
                      <td className="px-4 py-2">
                        <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                          {cs.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2">{new Date(cs.appliedDate).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/customers/${cs.customer.id}`}
                          className="text-blue-600 text-xs hover:underline"
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-6 pt-6 pb-4">
                <h2 className="font-semibold">All Pending Work Assigned to Me</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="px-4 py-2">Work ID</th>
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-4 py-2">Service</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Reference No.</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {myWork.pending.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                        No pending work assigned to you.
                      </td>
                    </tr>
                  )}
                  {myWork.pending.map((cs: any) => (
                    <tr key={cs.id} className="border-t">
                      <td className="px-4 py-2">{cs.workCode}</td>
                      <td className="px-4 py-2">{cs.customer.fullName}</td>
                      <td className="px-4 py-2">{cs.service.name}</td>
                      <td className="px-4 py-2">
                        <span className="text-xs px-2 py-1 rounded bg-slate-100">
                          {cs.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2">{cs.referenceNumber ?? "-"}</td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/customers/${cs.customer.id}`}
                          className="text-blue-600 text-xs hover:underline"
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "amber" | "red" }) {
  const toneClass = tone === "amber" ? "text-amber-700" : tone === "red" ? "text-red-700" : "text-slate-900";
  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
