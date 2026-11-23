# Project Proposal
## TTDC Fair Ticketing — Online Marketplace & Hybrid Android POS

| | |
|---|---|
| **Project** | TTDC Fair Ticketing Platform — Phase 2 Expansion |
| **Prepared for** | Tamil Nadu Tourism Development Corporation (TTDC) |
| **Prepared by** | [Development team / company name] |
| **Date** | November 2026 |
| **Version** | 1.0 |
| **Companion document** | `scope-of-work.md` — detailed in-scope/out-of-scope breakdown, acceptance criteria, and responsibilities. Read alongside this proposal. |

---

## 1. Background

TTDC currently runs a fair ticketing system covering event creation, counter-staff ticket issuance, role-based administration (Super Admin / Sub Admin / Counter Employee), GST-compliant receipts, and revenue reporting. It works as a single-counter, browser-based, always-online system.

TTDC has asked for this to grow into a full ticketing platform with three new capabilities:

1. A **public online marketplace** where visitors can browse and book tickets from their own browser, with or without creating an account.
2. A **POS Android application** for counter staff that works both online and offline — so ticket sales don't stop when connectivity at the fairground does.
3. **Payment integration with Indian Overseas Bank (IOB) and State Bank of India (SBI)**, covering both online card/UPI payments on the marketplace and the physical POS terminals these banks will supply for the counters.

## 2. Our understanding of the requirement

In the client's own words, the ask is: a marketplace for online booking from the browser, a POS that works in both offline and online mode with an Android APK, a login system that supports both signed-in and guest users, and payment handled through IOB and SBI, who will provide both the POS hardware and the integration APIs.

Read together, this is a request to turn a single-counter ticketing tool into a multi-channel ticketing platform — the same event and the same ticket inventory sold simultaneously online, at an online-connected counter, and at an offline counter, with every channel reporting into the same revenue and audit trail TTDC already relies on.

## 3. Proposed solution, in brief

One new backend system, serving three applications:

| Application | Purpose |
|---|---|
| **Marketplace (web)** | Public booking site. Guest checkout or registered login. Browse events, choose tickets, pay online via IOB/SBI, receive a QR e-ticket. |
| **POS Android APK** | Installed on counter devices. Issues tickets, accepts cash and card/UPI via the bank's terminal, keeps working with no network and syncs automatically once reconnected. |
| **Admin console** | The existing Super Admin / Sub Admin tools, now reading from the same real backend instead of each browser's local storage — so every channel's sales appear in one set of reports. |

The full technical rationale, architecture diagram, and payment-integration detail are in the companion **Technical Proposal** (`docs/technical-proposal-marketplace-pos.md`); this document and the Scope of Work focus on what is being delivered, how, and on what terms.

## 4. Key features

- Public event catalogue with search/browse, mobile-first design
- Guest checkout (phone-OTP verified) and registered accounts with booking history
- Online payment via IOB and SBI gateways, with e-ticket delivery by SMS/email
- Counter-staff POS app (Android) with cash, card, and UPI acceptance
- Full offline ticket issuance at the counter with no duplicate or lost tickets on reconnect
- Bank-supplied card terminal integration (IOB and SBI) at the counter
- Unified reporting across marketplace, online counters, and offline counters — by event, by counter, by payment mode, as today
- Continuation of the existing bilingual (English/Tamil) interface and Tamil Nadu heritage visual design across all three applications

## 5. Deliverables

1. Backend API service (events, orders/tickets, payments, offline sync, reporting, notifications)
2. Marketplace web application, deployed and accessible publicly
3. POS Android application (APK), installable on counter devices, online + offline capable
4. Updated Admin console, re-pointed at the new backend
5. IOB and SBI payment integrations — online gateway (marketplace) and POS terminal (counter)
6. Automated test suites (backend, web, Android) and a documented UAT pass with both banks
7. Deployment to production infrastructure, with monitoring and backup in place
8. Handover documentation and a walkthrough/training session for TTDC admin staff and counter operators

Full acceptance criteria for each deliverable are defined in the Scope of Work document.

## 6. Indicative timeline

Durations are estimates pending confirmation of team size and the open questions in §8; they assume bank onboarding (document submission, terminal allocation, sandbox credentials) starts in parallel with development rather than after it.

| Phase | Deliverable | Indicative duration |
|---|---|---|
| 0 | Backend foundation; Admin console migrated | 3–4 weeks |
| 1 | Marketplace MVP (online payment, one bank live) | 4–5 weeks, in parallel with Phase 2 |
| 2 | POS APK v1 (online-only, bank terminal integration) | 4–5 weeks, in parallel with Phase 1 |
| 3 | POS offline mode + sync engine | 3–4 weeks |
| 4 | Second bank integrated, registered accounts, hardening, bank UAT, go-live | 3–5 weeks |

**Total indicative duration: ~16–20 weeks from kickoff**, assuming no material delay from bank onboarding — which, based on current research, is the single largest schedule risk and sits outside the development team's control (see §8).

## 7. Team

| Role | Responsibility |
|---|---|
| Project Manager | Client coordination, bank liaison tracking, delivery schedule |
| Backend Engineer(s) | API, database, payment adapters, sync engine |
| Frontend Engineer (Web) | Marketplace, Admin console migration |
| Android Engineer | POS APK, offline data layer, bank terminal bridge |
| UI/UX Designer | Marketplace and POS visual design, extending the existing design system |
| QA Engineer | Test planning, automation, offline-mode test matrix, bank UAT support |

## 8. Assumptions and dependencies

- TTDC holds (or will establish) a merchant relationship with IOB and/or SBI; this proposal does not cover negotiating that relationship, only integrating against it once credentials/terminals are issued.
- Bank-side deliverables — gateway API documentation, POS SDK/terminal allocation, sandbox credentials — are supplied by IOB and SBI on their own timeline, which this team does not control. Delays here directly extend the schedule in §6.
- Hosting/infrastructure (server, database, domain, SSL) is provisioned on TTDC's behalf or by TTDC, in India, consistent with RBI data-residency requirements.
- Android devices for counter use are provided by TTDC or procured separately from the banks' terminal allocation; this proposal covers the application running on them, not device procurement.
- Content (event details, images, logo, terms & conditions text) is supplied by TTDC.
- This proposal and its companion documents are **technical and delivery scope only** — commercial terms (fees, payment schedule, warranty period) are to be agreed separately and are intentionally not stated here.

## 9. Commercial terms

Effort, pricing, and payment milestones are not included in this document and will be issued as a separate commercial quotation once the scope in the companion Scope of Work document is reviewed and confirmed with TTDC — in particular, the open questions in §8 of that document materially affect effort (e.g., one bank vs. two at launch, SoftPOS vs. dedicated EDC hardware).

## 10. Next steps

1. TTDC reviews this proposal and the Scope of Work document.
2. TTDC answers the open questions listed in the Scope of Work (§7) — these affect both schedule and cost.
3. Joint kickoff to confirm Phase 0 start date and finalize the commercial quotation.
4. Development begins on the backend foundation while bank onboarding (documentation, terminal/API allocation) runs in parallel.
