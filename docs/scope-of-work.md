# Scope of Work (SOW)
## TTDC Fair Ticketing — Online Marketplace & Hybrid Android POS

| | |
|---|---|
| **Project** | TTDC Fair Ticketing Platform — Phase 2 Expansion |
| **Companion document** | `proposal-document.md` — business overview, timeline, team, commercial note. Read alongside this SOW. |
| **Purpose of this document** | Define precisely what is and is not included in this engagement, who is responsible for what, what "done" means for each deliverable, and how changes to this scope are handled. |
| **Date / Version** | November 2026 &middot; v1.0 |

---

## 1. In scope

### 1.1 Marketplace (public web application)
- Public event catalogue (browse, view event detail, city/date, ticket categories and prices)
- Cart and checkout flow
- Guest checkout: name, phone, email; phone number OTP-verified
- Registered account: signup/login (phone+OTP or email+password), booking history
- Online payment via IOB and SBI (gateway integration — card, UPI, netbanking as offered by each bank)
- E-ticket generation and delivery (QR code, SMS and/or email)
- "My bookings" lookup for guests (by phone + OTP) and for registered users (account history)
- Bilingual interface (English/Tamil), responsive/mobile-first layout
- Visual design consistent with the existing Tamil Nadu heritage theme (teal/gold palette, light/dark mode)

### 1.2 POS Android application (APK)
- Counter-employee login (existing role model), with session cached for offline use
- Ticket issuance: category/quantity selection, cash and card/UPI payment, receipt printing (Bluetooth thermal printer)
- **Online mode:** full parity with the existing web counter flow, against the new backend
- **Offline mode:** ticket issuance continues with no network connection, using a locally reserved block of ticket serial numbers per device; queued sales sync automatically once connectivity returns, with no duplicate or lost tickets
- Bank POS terminal integration (IOB and SBI) for card/UPI payment at the counter, via whichever integration method the bank's terminal supports (App-to-App intent bridge, or SoftPOS, per §7 open questions)
- Visible sync/connectivity status indicator for counter staff

### 1.3 Backend platform
- REST API serving the Marketplace, POS APK, and Admin console
- Event/catalogue, order/ticketing (including serial-number allocation across online and offline channels), payment, offline-sync, reporting, and notification (SMS/email) services
- Database (PostgreSQL) as the single source of truth for all three channels
- Role-based authentication (Super Admin, Sub Admin, Counter Employee, Customer)
- Migration of the existing Admin console from browser `localStorage` to this backend, with existing functionality (events, counters, categories, reports, GST, shift close, audit log) preserved

### 1.4 Payment integration
- **IOB:** online gateway integration for the Marketplace; POS terminal integration for the Android app
- **SBI:** online gateway integration for the Marketplace; POS terminal integration for the Android app
- Refund/void flow mapped to the existing ticket-cancellation flow, for both banks
- Webhook/callback handling with signature verification and independent server-side status re-check before confirming any payment

### 1.5 Reporting
- Extension of existing reports (event-wise, counter-wise, GST, shift) to include a `channel` dimension — Marketplace, POS online, POS offline-synced — so revenue reconciliation across all three channels matches what TTDC can already see today for a single counter

### 1.6 Testing & quality assurance
- Automated backend unit/integration tests
- Automated Marketplace end-to-end tests (guest flow, registered flow, payment success/failure)
- Automated POS Android UI tests
- A dedicated offline-mode test matrix (connectivity loss mid-transaction, app kill during queued sync, serial-block exhaustion, concurrent multi-device sync)
- Joint UAT with IOB and SBI against their sandbox/test environments
- Load testing of the Marketplace for concurrent peak-day bookings against shared inventory
- A security review (OWASP Top 10) of the new backend prior to go-live

### 1.7 Deployment & handover
- Production deployment of backend and Marketplace, with monitoring and backup
- Packaged, signed Android APK ready for distribution to counter devices
- Handover documentation (architecture, API reference, runbook)
- One training/walkthrough session for TTDC admin staff and counter operators

---

## 2. Out of scope

The following are explicitly **not** included in this engagement unless added later by a signed change request (§6):

- Negotiating or establishing TTDC's merchant banking relationship with IOB or SBI — this team integrates against credentials/terminals once issued, but does not act on TTDC's behalf in the bank's own onboarding process
- Procurement of physical POS/EDC hardware — this is supplied by the banks per their own merchant agreement with TTDC
- An iOS counter application (Android only, per the current requirement)
- Loyalty programs, CRM, marketing/promotions tooling, or any public app beyond the ticket marketplace described in §1.1
- Any payment provider other than IOB and SBI (Razorpay's existing test-mode integration is retired as part of this work, not maintained in parallel, unless TTDC requests it be kept as a fallback)
- Content creation (event copy, photography, marketing text) — TTDC supplies content; the platform renders it
- Languages beyond English and Tamil
- Physical ticket counter hardware other than the Android device running the POS app and the bank-supplied card terminal (e.g., barcode scanners, cash drawers) unless specifically added later
- Ongoing hosting/infrastructure costs beyond initial deployment (cloud/server billing is a pass-through or TTDC-held cost, not a line item of this SOW)
- Post-launch support beyond an agreed warranty period (to be defined in the commercial terms, not this document)

---

## 3. Deliverables by phase

| Phase | Deliverable | Acceptance criteria |
|---|---|---|
| **0 — Backend foundation** | Backend API live; Admin console migrated off `localStorage` | Super Admin and Sub Admin can perform every action available today (create events, assign counters, issue tickets, run reports) against the new backend, with no data loss versus the current system |
| **1 — Marketplace MVP** | Public booking site, guest checkout, one bank's online payment live | A guest, with no account, can browse an event, pay online, and receive a valid scannable e-ticket, end to end, in a production-like environment |
| **2 — POS APK v1** | Android app, online-only, one bank's terminal integrated | A counter employee can log in, issue a ticket, take a card/UPI payment via the bank terminal, and print a receipt — matching today's web counter flow feature-for-feature |
| **3 — POS offline mode** | Offline issuance + sync engine | Tickets issued with the device in airplane mode sync correctly on reconnect, with zero duplicate or dropped tickets, verified against the offline test matrix in §1.6 |
| **4 — Hardening & go-live** | Second bank live, registered accounts, full test pass, bank UAT sign-off | Both banks' payment flows pass UAT in their own sandbox; security review findings closed; load test demonstrates no overselling under concurrent peak load |

Each phase is considered accepted when TTDC (or a nominated reviewer) signs off against its acceptance criteria above; sign-off gates the start of commercial payment milestones as defined in the separate commercial agreement.

---

## 4. Responsibilities

| Area | Development team | TTDC |
|---|---|---|
| Application design & build (Marketplace, POS APK, backend, Admin) | ✅ | — |
| Event/content data | — | ✅ |
| Bank merchant onboarding (documents, approvals) | — | ✅ |
| Bank integration (code against the bank's issued API/SDK) | ✅ | — |
| POS/EDC terminal hardware | — | ✅ (supplied by bank) |
| Android counter devices | — | ✅ (unless otherwise agreed) |
| Hosting/infrastructure provisioning | Advises on requirements | ✅ (or as separately agreed) |
| Testing & UAT execution | ✅ | Participates in bank UAT, final sign-off |
| Training | ✅ (delivers session) | ✅ (staff attend) |

---

## 5. Assumptions

- Bank-side artifacts (API docs, SDKs, sandbox credentials, terminal allocation) are made available within a reasonable time of merchant application approval; this SOW's timeline assumes onboarding proceeds without major delay.
- The existing ticketing domain model (events, ticket categories, roles, GST handling) is correct and carries forward — this engagement extends it, it does not redesign it.
- One event's ticket inventory is sold across all three channels (Marketplace, POS online, POS offline) simultaneously; the serial-block allocation approach in §1.2 is the agreed mechanism for preventing oversell, unless TTDC specifies a different inventory model.
- English and Tamil is the full language requirement.

---

## 6. Change control

Any request that falls under §2 (out of scope), or that materially changes a deliverable's acceptance criteria in §3 after that phase has started, is handled as a **change request**: documented in writing, assessed for schedule/cost impact, and requires sign-off from both TTDC and the development team before work begins. This protects the indicative timeline in the Proposal document from scope drift on either side.

---

## 7. Open questions (block finalizing scope, not just estimates)

These need answers before the commercial quotation and schedule in the Proposal document can be finalized:

1. **Bank hardware:** Does POS hardware come from IOB, SBI, or both? Has either bank named the specific EDC terminal model, or is SBI's SoftPOS (phone-as-terminal) an option?
2. **Launch scope:** Does go-live require both banks live simultaneously, or is one bank acceptable for Phase 1/2 with the second following in Phase 4 (as assumed in the Proposal's timeline)?
3. **Connectivity reality:** What is the actual network condition at TTDC's fairground counters — intermittent, or genuinely absent? This affects how much offline-mode engineering effort is actually necessary.
4. **Device ownership:** Will TTDC supply the Android devices for counters, or should procurement be part of this engagement?
5. **Fixed date:** Is there a hard go-live date (e.g., tied to a specific fair/event)? Bank onboarding timelines are the largest schedule risk and are outside this team's control.
6. **Razorpay:** Is the existing Razorpay integration retired outright, or kept as a fallback payment method alongside IOB/SBI?

---

### Related documents

- `proposal-document.md` — business proposal, timeline, team, commercial note
- `technical-proposal-marketplace-pos.md` — architecture, frontend/backend/design/testing detail
- `payment-gateway-options.md` — original SBI/Indian Bank research (marketplace-only scope; superseded in part by this SOW's broader IOB/SBI scope)
