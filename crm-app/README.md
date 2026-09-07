# CRM — Phase 1

Core loop implemented in this phase:

1. Employee/Admin/Manager **adds a customer**.
2. From the customer's profile, they **apply a service** for that customer
   (creates a `CustomerService` / work record — the customer is never duplicated,
   they can have many of these).
3. Anyone logged in can **search customers** (name / mobile / customer ID) and
   open a profile to see every service they've applied for, with status.
4. Admin and Employee can **edit a specific applied service** — change status,
   set the **reference number** (e.g. after online submission), add notes, mark
   completion date.
5. Every create/status-change/reference-number-set is written to an
   **activity log**, shown on the customer's profile.

Roles (`ADMIN`, `MANAGER`, `EMPLOYEE`) and permission checks are centralized in
`lib/auth.ts` so we can tighten/loosen who can do what without touching route
logic.

## Setup

```bash
cd crm-app
cp .env.example .env
# edit .env: set DATABASE_URL to a real Postgres instance, set NEXTAUTH_SECRET

npm install
npm run prisma:migrate      # creates tables + runs the seed automatically
npm run dev
```

Open http://localhost:3000/login and sign in with one of the seeded accounts:

| Role | Email | Password |
|---|---|---|
| Admin | admin@example.com | ChangeMe123! |
| Manager | manager@example.com | ChangeMe123! |
| Employee | employee@example.com | ChangeMe123! |

**Change these passwords before any real/production use.**

### Need a Postgres instance quickly for local dev?
- Easiest: [Neon](https://neon.tech) or [Supabase](https://supabase.com) — free tier, gives you a `DATABASE_URL` in under a minute, no local install needed.
- Or run Postgres locally with Docker: `docker run --name crm-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`

## What's deliberately NOT in Phase 1 yet
(from your full spec — coming in later phases as we agreed)
- Agents, agent-wise tracking, commissions
- Work assignment to a specific employee (status editing works now; the
  "assigned employee" field exists in the schema notes but isn't wired to UI yet)
- Payments
- Documents/file upload
- Aadhaar e-KYC flow (schema fields for `kycVerificationStatus` etc. are planned
  — see `architecture.md` — not built into this phase)
- Dashboard charts, reports, notifications, follow-ups
- Duplicate-check UI is basic (mobile-number match only)

## Project structure
```
app/
  api/            → all backend routes (customers, services, customer-services, auth)
  customers/      → list, new, [id] profile pages
  dashboard/
  login/
lib/
  auth.ts         → NextAuth config + centralized permission helpers
  prisma.ts       → DB client
  codes.ts        → CUS-000001 / WRK-000001 ID generation
  activityLog.ts  → audit log writer
prisma/
  schema.prisma   → DB schema
  seed.ts         → dev seed data
```

## Next step
Tell me which phase to build next — agents + agent-wise tracking, work
assignment to employees, payments/commissions, or the Aadhaar e-KYC flow — and
I'll add it on top of this same project.
