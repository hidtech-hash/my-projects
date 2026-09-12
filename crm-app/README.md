# CRM — Phases 1–4 (Core CRM, Agents, Fixed Pricing, Agent Portal + UPI Payments)

Core loop (Phase 1):
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

### Phase 2 — Agents, work assignment, employee dashboard
- **Agents module** (`/agents`, `/agents/new`, `/agents/[id]`).
- **Work assignment** to a specific employee, with auto-assignment of an
  employee's own intake to themselves.
- **Employee dashboard** (`/dashboard`) — pending work, work missing a
  reference number, and (Admin/Manager) an org-wide Unassigned Queue.
- Per-application `Payment Status` / `Amount Received`.

### Phase 3 — Fixed agent pricing, no commission
- **Services module** (`/services`) — every service has a fixed **Customer
  Price** and **Agent Price** (Admin/Manager only). No commission math
  anywhere: applying a service auto-picks the right price based on whether
  an agent is linked.

### Phase 4 (this update) — Agent User System, Agent Portal, UPI Payments
A whole new self-service layer for agents, on top of everything above:

- **New role: `AGENT`.** Admin/Manager can create a portal login for an
  agent (at creation time, or later from the agent's profile) — one login
  is linked 1:1 to one `Agent` record via `Agent.userId`.
- **Route-level isolation.** `middleware.ts` now checks role, not just
  "logged in": an `AGENT` session is hard-blocked from every admin/manager
  page and API and redirected to `/agent`. This is enforced at the routing
  layer, not just hidden in the UI — an agent calling an admin API directly
  gets a 403, not just a missing button.
- **Agent Dashboard** (`/agent`): an agent sees *only* their own
  applications (customer, service, reference number, status, amount,
  received, pending) and summary totals (total applications / total amount
  / received / pending) — resolved server-side from their session, never
  from a client-supplied agent id.
- **Still no commission.** Agent pricing is exactly what Phase 3 built —
  the fixed `Service.agentPrice`. This phase only adds payment *collection*
  on top of that fixed pricing.
- **UPI Configuration** (`/settings/upi`, Admin/Manager only): set the
  business UPI ID (and payee name) used to generate every agent's QR.
  Enable/disable without losing the value; history is kept, not overwritten.
- **Dynamic UPI QR per agent**: the agent dashboard shows a QR encoding the
  configured UPI ID + **that agent's current pending amount**, computed
  fresh server-side on every load — the agent's browser never gets a
  chance to influence the amount. ₹0 pending shows "No pending payment"
  instead of a QR.
- **Manual payment verification workflow** (no payment gateway):
  1. Agent pays via the QR in their own UPI app.
  2. Agent goes to **My Payments** (`/agent/payments`) and submits a
     **UTR + screenshot only** — there is deliberately no amount field
     anywhere in that form or its API. The agent cannot tell the system how
     much they paid.
  3. This creates an `AgentPaymentRequest` with status
     `PENDING_VERIFICATION`. Nothing about the agent's balance changes yet.
  4. Admin/Manager reviews it on **Payment Requests** (`/payment-requests`):
     views the UTR and screenshot, manually enters the **actual verified
     amount**, and Approves or Rejects.
  5. **Only on Approve** does anything change: the verified amount is
     recorded, and immediately allocated across the agent's outstanding
     applications — oldest first, filling each one's remaining balance
     before moving to the next (`lib/agentContext.ts:allocatePaymentToAgentWork`).
     This is what keeps each application's own `amountReceived`/
     `paymentStatus` and the agent's aggregate total/received/pending
     numbers in agreement — there's one source of truth (the
     `CustomerService` rows), and `AgentPaymentRequest` is the permanent
     audit trail of *why* they changed.
  6. On Reject, nothing about the balance changes at all; the rejection
     reason is stored and visible to the agent.
- **Payment screenshot storage**: saved to `/public/uploads/payment-screenshots/`
  on local disk for now (a pragmatic dev-friendly default — `lib/uploads.ts`
  is a single, isolated swap-point for real object storage like S3/R2 later;
  nothing else needs to change since callers only ever see the returned URL).

Roles (`ADMIN`, `MANAGER`, `EMPLOYEE`, `AGENT`) and permission checks are
centralized in `lib/auth.ts`.

## Setup / applying this update

```bash
cd crm-app
npm install          # picks up the new `qrcode` dependency
npm run prisma:migrate      # prompts for a migration name, e.g. "agent_portal_upi_payments"
npm run dev
```

`prisma migrate dev` will detect: the new `AGENT` role value, `Agent.userId`,
and the two new models (`UpiConfig`, `AgentPaymentRequest`) — all additive,
nothing destructive this time. It re-runs the seed, which now also creates:
an agent portal login, a UPI config, and a sample pending payment request.

Fresh setup (first time):
```bash
cd crm-app
cp .env.example .env
# edit .env: set DATABASE_URL to a real Postgres instance, set NEXTAUTH_SECRET
npm install
npm run prisma:migrate
npm run dev
```

### Logins

| Role | Login | Password |
|---|---|---|
| Admin | admin@example.com | ChangeMe123! |
| Manager | manager@example.com | ChangeMe123! |
| Employee | employee@example.com | ChangeMe123! |
| **Agent** | **rahul01** | **ChangeMe123!** |

**Change these before any real/production use.**

### Try the full agent payment flow end-to-end
1. Log in as Admin → **UPI Settings** → confirm `business@upi` is configured
   (seeded already).
2. Log in as **rahul01** (Agent) → **Dashboard** → see two unpaid seeded
   applications (₹200 + ₹150 = ₹350 pending) and a QR for ₹350.
3. Go to **My Payments** → see a seeded request already sitting at
   "PENDING VERIFICATION" with UTR `SEED123456789`.
4. Log back in as Admin or Manager → **Payment Requests** → find that
   request → click **Verify** → enter a verified amount (e.g. `200`) →
   **Approve**.
5. Log back in as **rahul01** → Dashboard now shows pending reduced to
   ₹150, and the QR amount has updated automatically. The PAN Card
   application is now marked `PAID` (or `PARTIAL`, depending on the amount
   you entered) on the agent's own applications table.
6. Try submitting a *new* payment request as rahul01 (My Payments →
   upload any PNG/JPG as the screenshot) and reject it as Admin/Manager —
   confirm the pending amount does **not** change on rejection.

### Need a Postgres instance quickly for local dev?
- Easiest: [Neon](https://neon.tech) or [Supabase](https://supabase.com) — free tier, gives you a `DATABASE_URL` in under a minute, no local install needed.
- Or run Postgres locally with Docker: `docker run --name crm-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`
- Or install Postgres natively on Windows (see setup steps discussed in chat).

## What's deliberately NOT in yet
- Documents/file upload for customer-facing applications (screenshots for
  agent payments ARE implemented — see above; this is about e.g. Aadhaar
  copies, application forms)
- Aadhaar e-KYC flow (schema fields for `kycVerificationStatus` etc. are
  planned — see `architecture.md` — not built into this phase)
- Dashboard charts, full reports module, notifications, follow-ups
- Employee incentive tracking (separate from agent pricing)
- Duplicate-check UI is basic (mobile-number match only)
- Real object storage for payment screenshots (currently local disk — see
  `lib/uploads.ts`)
- Agent record soft-delete UI (deactivate exists; delete does not)

## Project structure
```
app/
  api/
    customers/, customer-services/, agents/, services/, employees/
    dashboard/my-work/                → admin/employee dashboard data
    upi-config/                        → GET/POST/PATCH, admin/manager only
    payment-requests/[id]?             → admin/manager: list + verify/approve/reject
    agent-portal/
      dashboard/                        → agent's own applications + totals
      qr/                                → agent's own dynamic UPI QR
      payment-requests/                  → agent's own submit (UTR+screenshot) + history
    auth/
  customers/, agents/, services/, dashboard/, login/     → admin/manager/employee UI
  agent/                                → agent dashboard
  agent/payments/                        → agent payment submission + history
  payment-requests/                       → admin/manager verification screen
  settings/upi/                            → admin/manager UPI configuration
lib/
  auth.ts             → NextAuth config + centralized permission helpers (incl. AGENT)
  prisma.ts           → DB client
  codes.ts            → CUS-000001 / WRK-000001 / AGT-000001 ID generation
  activityLog.ts       → audit log writer
  agentContext.ts       → resolve session -> Agent, balance calc, FIFO payment allocation
  upi.ts                 → UPI URI + server-side QR generation
  uploads.ts               → local-disk screenshot storage (S3 swap-point)
components/
  Nav.tsx              → admin/manager/employee nav
  AgentNav.tsx          → separate, minimal nav for the agent portal
middleware.ts           → auth + role-based route isolation for AGENT
prisma/
  schema.prisma          → DB schema
  seed.ts                  → dev seed data (incl. agent login + UPI config + sample request)
```

## Next step
Tell me which phase to build next — the Aadhaar e-KYC flow, real customer
document uploads, a proper reports/dashboard-charts module, or something
else — and I'll add it on top of this same project.
