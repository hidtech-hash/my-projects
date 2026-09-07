import Nav from "@/components/Nav";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <Nav />
      <main className="max-w-5xl mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
        <p className="text-slate-600 mb-8">
          Phase 1: customer intake and service application/status tracking. More cards
          (agents, payments, reports) get added in later phases.
        </p>
        <Link
          href="/customers"
          className="inline-block bg-slate-900 text-white px-4 py-2 rounded"
        >
          Go to Customers →
        </Link>
      </main>
    </div>
  );
}
