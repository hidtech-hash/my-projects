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

---

## Phase 5 — Agent Self-Service Applications, Dynamic Fields/Documents, Accept/Reject Workflow

This phase adds the biggest architectural piece yet: agents submit their own applications, which flow through a real review workflow, and the fields/documents each service needs are entirely admin-configurable — no per-service code anywhere.

### 1–2. Agent search + Apply for Service
- Agent Dashboard (`/agent`) now has a search box (customer name, mobile, work code, reference number, service name, status) scoped server-side to that agent's own applications only — the query itself filters by `agentId: agent.id`, so there's no way to widen it into another agent's data.
- **Apply for Service** (`/agent/apply`): mobile-first customer lookup (find existing or add new) → pick a service → the form renders itself from that service's configuration.

### 3–6. Dynamic documents
- New **Service Configuration** page (`/services/:id`, linked from the Services list) lets Admin/Manager add/edit/remove **Document Requirements** (name + required/optional) per service — this is what the agent's upload form and the staff review checklist both read from, generically.
- The agent's apply form always additionally offers 3 **common optional documents** (Aadhaar Card, Photo, Signature) plus a **+ Add Document** button for anything custom-named — none of this is hard-coded per service, and it never overrides what the service actually requires.
- Submission is blocked server-side (not just in the UI) if any `required` document is missing — the same check exists at resubmit time too.

### 7–9. Dynamic service fields
- The same Service Configuration page has an **Application Fields** section: Admin/Manager define fields with a type (Text/Number/Date/Email/Phone/Password/Textarea/Select/Checkbox), whether it's required at submission, and whether it can still be edited later — e.g. Passport's `File Number` can be marked "not required initially" so an agent isn't blocked from submitting without it, and staff can fill it in once it exists.
- The agent's apply form renders whatever fields are configured for the selected service — nothing is hard-coded per service name.

### 12–17. Review workflow and the payment-timing rule
- Agent-submitted applications start at status **`PENDING_REVIEW`** and show up on a new **org-wide "Pending Review"** section on the staff Dashboard, visible to Admin/Manager/Employee alike.
- Opening one (`/applications/:id`) shows the full picture — customer, agent, submitted field values, a documents checklist with Required/Optional/Uploaded/Missing indicators, and **Accept**/**Reject** buttons. Rejecting requires a reason (enforced server-side too).
- **The payment-timing rule is implemented with a single, minimal change**: `lib/agentContext.ts`'s balance calculation now excludes `PENDING_REVIEW`, `REJECTED`, and `CANCELLED` applications from an agent's total/received/pending. There's no separate "add to balance" step to call — the moment staff flip an application's status away from `PENDING_REVIEW` (e.g. to `ACCEPTED`), the very next balance query picks it up automatically. Submitting never inflates an agent's balance; only accepting does.
- **Resubmit**: from a `REJECTED` application (`/agent/applications/:id`), the agent can update field values and re-upload/add documents, then resubmit — same record, same work code, full history preserved via the activity log. Status returns to `PENDING_REVIEW`.
- **Cancel**: from a `REJECTED` application, the agent can instead cancel it — status becomes `CANCELLED`, stays in history, never touches the balance.

### 18–21. Customer mobile-first lookup + Edit Customer
- **Add Customer** (`/customers/new`) now asks for the mobile number first. If a customer already exists with that number, it shows "Customer Found" with a direct link to their profile instead of re-collecting everything. If not, the rest of the form appears with the mobile pre-filled.
- **Edit Customer**: the customer profile page now has an inline "Edit Customer" toggle — edits the same record in place; every existing application keeps referencing the same customer id.
- The same lookup logic (`lib/customerLookup.ts`) is shared between the staff flow (`/api/customers/lookup`) and the agent flow (`/api/agent-portal/customers/lookup`) — one function, two thin route wrappers so the AGENT-only middleware boundary stays simple.

### 24–25. Authorization
- All of the above is layered on the existing role helpers in `lib/auth.ts` — no new role was needed (`ADMIN`/`MANAGER`/`EMPLOYEE`/`AGENT` from Phase 4 cover everything here). An agent physically cannot reach `/api/customer-services/:id` (the accept/reject endpoint) at all — it's outside the `/api/agent-portal/*` allowlist enforced in `middleware.ts` — so "an agent can't accept their own application" is true by construction, not just a missing button.
- Every dynamic field/document CRUD endpoint (`/api/services/:id/fields*`, `/api/services/:id/documents*`) is gated by `canManageServices` (Admin/Manager), same tier as pricing.

### Database changes
- `ServiceStatus` enum: added `PENDING_REVIEW`, `ACCEPTED` (existing values untouched).
- New models: `ServiceField`, `ServiceDocumentRequirement`, `ApplicationFieldValue`, `ApplicationDocument`.
- `CustomerService`: added `rejectionReason`, plus relations to the two new "Application*" models.
- `Customer`: added `updatedById`/`updatedBy` (was missing — needed for Edit Customer's audit trail).
- `lib/uploads.ts` generalized to `saveApplicationDocument` (images + PDF) alongside the existing `savePaymentScreenshot` (images only) — both are thin wrappers around one shared local-disk helper.

### Setup / applying this update
```bash
cd crm-app
npm install
npm run prisma:migrate      # e.g. "agent_applications_dynamic_fields_documents"
npm run dev
```
Re-seeds with: document requirements + a dynamic field on two of the sample services, one `PENDING_REVIEW` application (try accepting or rejecting it from `/applications/:id` or the Dashboard's Pending Review section), and one already-`REJECTED` application (try Fix & Resubmit or Cancel from the agent's own dashboard).

### Try it end-to-end
1. Log in as **rahul01** (Agent) → **Apply for Service** → search an existing mobile (`9876543210`, seeded) → pick **PAN Card** → see the Aadhaar Card (required) / Photo (optional) upload fields appear automatically → submit.
2. Log in as Admin/Manager/Employee → **Dashboard** → see it under **Pending Review** → open it → **Accept**.
3. Log back in as rahul01 → Dashboard → pending balance just went up by the PAN Card agent price (₹200) — it wasn't counted before acceptance.
4. Try the seeded `WRK-000006` (Aadhaar Update, already `REJECTED`) from rahul01's dashboard → **Fix & Resubmit** → see the rejection reason, correct the field, resubmit → it reappears in staff's Pending Review queue.
5. As Admin/Manager, go to **Services → PAN Card → Configure Fields/Docs** and add a new field or document requirement — reload the agent's Apply for Service form and see it appear with zero code changes.

## What's deliberately NOT in yet
- Aadhaar e-KYC flow (unrelated to the above; still from the original spec)
- Full reports/dashboard-charts module, notifications, follow-ups
- Employee incentive tracking
- Real object storage for uploads (still local disk — `lib/uploads.ts`)
- Field/document reordering UI (the `sortOrder` column exists and is respected on read; there's no drag-to-reorder control yet — new items just append to the end)
- Editing a dynamic field's value from the staff review screen (currently view-only there; editing happens via the agent's resubmit flow, or directly in the database/Prisma Studio for a quick fix)

---

## Bugfix — Agent "Apply for Service" empty service list + My Applications table layout

**Root cause 1 — services not loading for agents:** the Apply for Service page was calling `/api/services` and `/api/services/:id`, which sit outside the `/api/agent-portal/*` allowlist enforced in `middleware.ts` (added in Phase 4 for agent route isolation). Every request from an agent session was silently getting a 403 from the middleware before it ever reached the route handler; the frontend's `d.services ?? []` then quietly rendered an empty list instead of surfacing an error.

Fix: extracted the actual service queries into `lib/services.ts` (`listActiveServices`, `listAllServices`, `getServiceWithConfig`) — one shared source of truth, no duplicate service list, no hard-coding. The existing staff routes (`/api/services`, `/api/services/:id`) now call these same functions. Two new thin wrapper routes, `/api/agent-portal/services` and `/api/agent-portal/services/:id`, call the identical functions from inside the agent-portal namespace so they're reachable under the AGENT middleware allowlist. Any service Admin/Manager marks active in Service Management appears for agents automatically — same data, same `isActive` flag, just a second reachable path to it.

**Root cause 2 — My Applications columns getting clipped:** the table had no horizontal-scroll container and sat inside a `max-w-4xl` page with `overflow-hidden` on the table's wrapper — so with 9 columns plus long service names, the browser compressed columns instead of scrolling, and the View action could end up clipped.

Fix (`app/agent/page.tsx`): wrapped the table in `overflow-x-auto`, gave it a `min-w-[860px]` so columns get a horizontal scrollbar instead of being squeezed unreadable, added `whitespace-nowrap` to all the short/fixed-format columns (ref no., date, status, amounts, action) so they never wrap awkwardly, and `truncate` + `title` tooltip on the Customer/Service columns so one long name can't blow out the layout. Widened the page container from `max-w-4xl` to `max-w-5xl` to match every other table page in the app. No columns were removed — all nine (Customer, Service, Ref. No., Applied, Status, Amount, Received, Pending, Action) are still there, and the View/Fix & Resubmit action is now guaranteed visible via scroll rather than being at risk of clipping.

**Explicitly not touched:** the payment-timing logic in `lib/agentContext.ts` (submitting never adds to an agent's pending balance; only acceptance does), the `/api/agent-portal/applications/:id` scoping that prevents one agent from reaching another's data, and every other existing workflow — this was a two-file-plus-one-shared-helper fix, nothing else in the app changed.

---

## Bugfix round 2 — accepted applications vanishing, agent search crash, plus Agent Management improvements

### 1–2. "Forbidden: cannot reassign work" + accepted applications not appearing anywhere

**Root cause:** two bugs compounding. First, the customer-profile edit form always resent `assignedEmployeeId` in its save request — even when the user never touched that control — and the server compared the incoming value against the *acting user's own id* instead of the *record's current value*. Any Employee without reassignment permission saving a reference number on an application that had no assignee yet (which was *every* agent-submitted application, since nothing ever assigned one) got rejected as a false "reassignment." Second, and the real root of "it doesn't appear in Incomplete Applications": nothing ever auto-assigned an accepted application to anyone, so it had nowhere to show up as "my work."

**Fix:**
- `app/api/customer-services/[id]/route.ts` now compares the *effective* new assignee against the record's *existing* assignee — resending an unchanged value, or self-claiming, is always allowed regardless of role; only an actual handoff to someone else still requires `canAssignWork`.
- Accepting a previously-unassigned application now auto-assigns it to whoever accepts it (same pattern as an employee's own customer intake auto-assigning to themselves). It immediately shows up under the existing **Incomplete Applications** dashboard section (this label already existed from Phase 5 — it just had nothing to show).
- A new `acceptedAt` timestamp is stamped the moment an application first becomes balance-eligible (acceptance for agent-submitted work; immediately for staff-created work) — this also became the ledger source for the new "Payment Pending From" column (see below).
- Added `PUT /api/customer-services/:id/fields` so staff can now fill in/update fields a service marks `editableAfterSubmission` (e.g. a Passport's File Number) — previously view-only.

### 3. Agent Search returning nothing

**Root cause:** the search query unconditionally included `{ status: { equals: <raw search term> } }` against a typed enum column. Prisma throws a validation error for any value that isn't a real `ServiceStatus` member — which is every search term except an exact status name — so the whole query crashed on virtually every real search (a name, a mobile number, a service name).

**Fix:** that clause is now only added when the search term actually matches a known status value (checked against `Object.values(ServiceStatus)`, not a hand-maintained list).

### 4–5. Enterprise Name

`Agent.enterpriseName` is now required when creating an agent (validated both in the form and server-side via Zod). Existing agents created before this field existed default to `""` (a DB default, not a blocked migration) and show "Not set" in the list / a prompt to add one on their profile — nothing about existing data was made invalid. The Agent Portal navbar (`AgentNav`) now fetches the logged-in agent's own `enterpriseName` via a new lightweight `/api/agent-portal/me` endpoint and displays it in place of the hard-coded "Agent Portal" label.

### 6–7. Agent list columns + Agent Management summary cards

Both are entirely ledger-derived (`lib/agentContext.ts`), never computed in the UI:
- **Pending Payment** — same balance calculation used everywhere else.
- **Payment Pending From** — days since `acceptedAt` on the *oldest* currently-unpaid application for that agent; green at ≤7 days, red beyond; "No Due" (not "0 days") when nothing is outstanding.
- **Summary cards** (`GET /api/agents/summary`) — Total Agents, Total/Paid/Pending Payment, Agents With/Without Due. "Paid" specifically sums *approved* `AgentPaymentRequest.verifiedAmount` (per the spec's "only verified/approved payments count as paid"), which is deliberately a different figure from the general `amountReceived` sum used for "pending," since the latter can also be adjusted directly by staff for edge cases (e.g. the existing "Mark Fully Paid" shortcut).

### 8. Payment logic

Unchanged — verified by re-reading `lib/agentContext.ts`'s `EXCLUDED_FROM_BALANCE` list and the allocation logic before touching anything else in this round. The only related change was exporting that list so the acceptance endpoint could reuse the exact same source of truth for "when does this become balance-eligible" instead of duplicating it.

### 9–10. "Pay Through UPI App"

Added next to the QR on the Agent Dashboard as a plain `<a href="upi://...">` link — the standard way to trigger an installed UPI app on mobile. Uses the same server-computed `uri` the QR is generated from (now also returned by `/api/agent-portal/qr`), so there's no separate path for an agent to influence the amount. On desktop it simply does nothing harmful if unsupported; a caption below explains to scan the QR instead. The CRM still never assumes a payment succeeded — the UTR + screenshot + manual verification flow is completely unchanged.
