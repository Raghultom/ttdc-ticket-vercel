# Switching from Razorpay to SBI / Indian Bank — what it takes

**Prepared for:** TTDC Fair Ticketing — payment gateway decision
**Status:** Research summary based on publicly available information. Final fees, timelines, and technical specs must be confirmed directly with the bank's relationship manager once a merchant application is filed — banks do not publish these details.

---

## 1. Where this stands today

The app currently has a **Razorpay Checkout** integration (`src/services/payment/razorpay.ts`). It is explicitly marked in code as test-mode only:

> "Frontend-only test-mode integration... without a backend there is no order creation or signature verification, so this must not be used for real payments as-is."

This matters more than which bank gets chosen: **the current app has no backend server at all** — it's a React front end backed by `localStorage` (see `src/services/mock/storage.ts`). Razorpay's checkout widget is the one real-world payment flow that can *sort of* work without a backend, because it lets the browser talk to Razorpay directly for test-mode card/UPI collection. That shortcut does not exist for SBI ePay or Indian Bank's gateway, or for Razorpay in production either.

## 2. The one finding that applies no matter which bank is chosen

**A backend server is required.** Every real bank payment gateway in India works the same way under the hood:

1. Your server creates an "order" with the bank (amount, reference number) using a **secret key that must never be exposed in a browser**.
2. The customer is redirected to the bank's hosted payment page, or a widget opens, to actually pay.
3. The bank calls back **your server** (not the browser) with the result, signed with a checksum/hash so you can tell it's genuinely from the bank and not forged.
4. Your server independently re-queries the bank's status API to confirm the payment before marking the ticket as paid — browser callbacks alone are not trustworthy enough to rely on for money.

None of this can be done safely from a pure frontend app. **This is the real scope of the change** — "swap Razorpay for SBI" is really "build a backend, then point it at whichever bank is chosen." The bank choice itself is almost a smaller decision by comparison.

## 3. Option A — SBI ePay

SBI's own payment aggregation platform ([sbiepay.sbi](https://www.sbiepay.sbi/), onboarding portal at [epay.sbi.bank.in](https://epay.sbi.bank.in/secure/home)), built specifically to also serve **government departments and PSUs** — TTDC fits this category directly.

- **Eligibility:** Normally requires 6 months of business track record, but this is explicitly waived at SBI's discretion for government bodies, PSUs, and educational institutions.
- **Documents typically required for a government department:**
  - Self-certification letter on department letterhead
  - Authorised signatory's posting order
  - KYC of authorised signatories (photo, PAN, address proof)
  - Banker's certificate (account details + signature verification)
  - Signed Agreement/MOU with SBI
  - Proof the website domain is registered in the department's name
- **Integration model:** Server-to-server API. SBI whitelists your production/staging server IP and domain before the test endpoint even becomes reachable — this has to happen before any development can start. SBI provides a **Merchant Integration Document with technical specification** only after onboarding begins (not public).
- **Payment methods:** Cards, netbanking, UPI (same broad coverage as Razorpay).
- **What we don't know yet** (not publicly published, confirm with SBI's relationship manager): exact fee/MDR per transaction, settlement T+n timeline, sandbox/UAT availability before production whitelisting.

## 4. Option B — Indian Bank: IB Collect / IB Collect Plus

Indian Bank's equivalent product ([indianbank.bank.in/en/online-collection-products](https://indianbank.bank.in/en/online-collection-products)), explicitly marketed to government departments alongside schools, e-commerce, insurance, and mutual fund merchants.

- **Payment methods:** Debit/credit cards, UPI, wallets, netbanking (select banks), plus NEFT/RTGS — broader offline-transfer support than SBI ePay or Razorpay offer.
- **Integration options:** Three tiers, not just one:
  - **API integration** with our website/app (the one relevant to this ticketing system)
  - Excel-upload / open-form based collection (for one-off bulk billing, not relevant here)
  - Shareable **payment links** (could be a quick fallback for phone/counter bookings, but not a fit for the live counter-issuing flow)
- **How to apply:** No online self-service application found — Indian Bank's own page says to visit the nearest branch and request the "IB Collect" application. This is a materially different starting point from SBI's more documented, government-oriented onboarding path.
- **What we don't know yet:** No public sandbox/UAT environment found, no published technical integration document, no published fee schedule or settlement timeline. Indian Bank's public materials are focused on the product's existence and benefits, not developer-facing specifics.

## 5. Side-by-side

| | SBI ePay | Indian Bank (IB Collect) |
|---|---|---|
| Built for govt/PSU merchants | Yes, explicitly, with relaxed eligibility | Yes, listed as a target segment |
| Payment methods | Cards, netbanking, UPI | Cards, netbanking, UPI, wallets, **+ NEFT/RTGS** |
| Public integration documentation | Some (merchant integration doc issued at onboarding) | Essentially none found publicly |
| Application process | Document checklist above, via SBI relationship manager | Visit a branch, ask for the application form |
| IP/domain whitelisting required before dev work | Yes (confirmed) | Not documented either way — ask |
| Fees / settlement timeline | Not published — confirm with SBI | Not published — confirm with Indian Bank |

## 6. Regulatory note (why this is simpler than a non-bank PG switch)

The RBI's Payment Aggregator / Payment Gateway directions (the rules that force companies like Razorpay, PayU, and Cashfree to hold ₹25 crore net worth, keep customer money in escrow, and get RBI-authorised) apply to **non-bank** aggregators. SBI and Indian Bank are scheduled commercial banks offering this as a banking product directly — the compliance burden sits with the bank, not with TTDC. TTDC's side of this is a standard merchant-onboarding relationship with its own bank, not a payment-aggregator license application.

## 7. What actually has to happen, split by who does it

**TTDC / client (administrative, can start immediately, don't need dev work to finish):**
- [ ] Decide: SBI ePay only, Indian Bank only, or both (one primary + one fallback)
- [ ] Confirm which bank TTDC already holds its settlement/current account with — that bank will be the path of least resistance
- [ ] Assign an authorised signatory and gather their KYC documents
- [ ] Submit the merchant application (SBI: document checklist in §3; Indian Bank: branch visit)
- [ ] Request the Merchant Integration Document + sandbox/UAT credentials once the application is accepted
- [ ] Get written confirmation of per-transaction fees and settlement (T+n) timeline before go-live

**Development (can't meaningfully start until the bank responds with real credentials/specs):**
- [ ] Stand up a real backend (currently none exists) — order creation endpoint, webhook/callback receiver, status-polling job
- [ ] Store the bank's secret key/credentials server-side only, never in `.env`-style frontend variables like today's `VITE_RAZORPAY_KEY_ID`
- [ ] Replace `src/services/payment/razorpay.ts` with an adapter that calls **our own backend**, not the bank directly — the backend talks to the bank
- [ ] Map the bank's refund/void API to the existing ticket-cancellation flow (`src/services/api/tickets.ts` → `cancel()`)
- [ ] Full UAT pass in the bank's test environment before any production whitelisting request
- [ ] Update `PaymentInfo` in `src/types/models.ts` if the bank's reference ID shape differs from Razorpay's (currently assumes a single `razorpayPaymentId`/`razorpayOrderId` pair)

## 8. Questions only TTDC can answer

1. Does TTDC already have an existing merchant/collection relationship with SBI or Indian Bank (fee collection, other departments) that this can piggyback on?
2. Is there a hard go-live date driving this? SBI's whitelisting-before-sandbox-access step and Indian Bank's branch-based application both sound like they take real calendar time, not days.
3. Is NEFT/RTGS (bank transfer) a payment method we actually want at the ticket counter, or is it UPI/card only? This affects which bank's broader method list actually matters.
4. Should Razorpay stay as a fallback/secondary method (many government portals run two gateways) or be fully retired?

## 9. Recommendation

Start the **SBI ePay** application in parallel with development planning — it has the more concrete, government-oriented onboarding path and some technical documentation trail to follow, even though the full spec is only released after onboarding. Treat **Indian Bank IB Collect** as the fallback or second-channel option, especially if TTDC's existing banking relationship is with Indian Bank — but go in expecting a slower, less self-service process based on what's public today. Either way, the backend work in §7 is the actual critical path, not the choice of bank.

---

### Sources

- [SBIePay](https://www.sbiepay.sbi/)
- [SBIePay merchant portal](https://epay.sbi.bank.in/secure/home)
- [SBI merchant onboarding agreement (PDF)](https://www.sbipayments.com/pdf/merchant-terms.pdf)
- [SBI ePay overview — Stable Money](https://stablemoney.in/credit-card/sbi-epay)
- [SBI Pay Laravel integration reference](https://github.com/Jagdish-J-P/sbi-pay)
- [Indian Bank — Online Collection Products (IB Collect)](https://indianbank.bank.in/en/online-collection-products)
- [Indian Bank — Merchant UPI QR Code](https://indianbank.bank.in/en/merchant-upi-qr-code)
- [RBI — Guidelines on Regulation of Payment Aggregators and Payment Gateways](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12050)
- [RBI Payment Aggregator Directions, Sept 2025 (PDF)](https://www.fidcindia.org.in/wp-content/uploads/2025/09/RBI-PAYMENT-AGGREGATORS-DIRECTIONS-15-09-25.pdf)
