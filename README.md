# TTDC Fair – Counter Ticketing System (Frontend)

A web-based counter ticketing system for TTDC fairs. Super Admin creates **Events** (each with
its own date range, counters, and sub-admin assignments); counter staff issue entry tickets,
collect payment (Cash or UPI via Razorpay), and print a ticket on a connected printer. The app
is available in **English and Tamil** (switch anytime from the top bar).

**This is the frontend-only phase.** All data is stored in the browser via `localStorage`
through a service layer in `src/services/`, so a real backend can replace it later without
touching any UI code (see `src/services/api/*.ts` for the functions a backend would implement,
and §9.4 of the original requirements doc for the matching REST API shape).

## Tech stack

React 18 + Vite + TypeScript · React Router v7 · Zustand · MUI · react-hook-form + zod ·
Recharts · dayjs · react-to-print · Razorpay Checkout · SheetJS (xlsx) · qrcode.react ·
react-i18next

## Events

Everything is scoped under an **Event** (Super Admin → Events): name, venue, date range, and
timings. Each event owns its own counters, and each counter has one sub-admin (name, mobile,
email, username/password) assigned when it's added. Ticket categories and GST/tax settings are
shared across all events.

- **Upcoming** (today before start date): fully editable, including moving the start date.
- **Ongoing** (today within the date range): only the end date can be extended.
- **Over** (today after end date): read-only.

Every report (Dashboard, Transactions, Counter/Sub Admin, GST, Shift Close) has an Event filter
— pick one or leave it on "All Events" to see everything at once.

## Language

Click **English / தமிழ்** in the app bar (also on the login screen) to switch. The choice is
saved per browser (`localStorage`) and applies everywhere, including the printed ticket and
shift-close summary. Data you type yourself — event names, category names, footer text — is
never auto-translated; only the app's own labels switch.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in a real Razorpay test key if you need UPI to work
npm run dev             # starts Vite dev server
npm run build            # type-checks and builds for production
npm run test             # runs the Vitest unit tests (billing/tax calculations)
```

### Demo accounts (seeded automatically on first load)

| Role | Username | Password |
|---|---|---|
| Super Admin | `admin` | `admin123` |
| Sub Admin — Main Gate (C01) | `counter1` | `counter123` |
| Sub Admin — East Gate (C02) | `counter2` | `counter123` |
| Sub Admin — West Gate (C03) | `counter3` | `counter123` |

Sample data is seeded into `localStorage` the first time the app loads: one event ("TTDC Fair
2026", ongoing), its 3 counters, ~200 tickets across the last 7 days, 5 ticket categories, and
GST settings. To reset, clear site data for the app's origin in your browser (or clear
`localStorage` keys prefixed `ttdc_ticketing_`) and reload.

## Environment variables

```
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx   # Razorpay test Key ID — see below
VITE_APP_NAME=TTDC Fair
VITE_USE_MOCK_API=true
```

> ⚠️ Only the Razorpay **Key ID** goes here. The **Key Secret** must never be in frontend
> code or any `.env` file shipped to the browser.

## Razorpay test setup

1. Create a free account at [razorpay.com](https://razorpay.com) and switch to **Test Mode**.
2. Copy the test **Key ID** (starts with `rzp_test_`) from Settings → API Keys into
   `VITE_RAZORPAY_KEY_ID` in `.env`.
3. In the Razorpay dashboard, enable **auto-capture** for payments, otherwise successful
   test payments stay "authorized" and can get auto-refunded instead of settling.
4. On the Issue Ticket screen, choose **UPI (Razorpay)** and use Razorpay's documented test
   UPI handles / test cards to simulate success, failure, and cancellation.

### Known limitation (frontend-only, by design)

Without a backend there is no server-side order creation or payment signature
verification — a "successful" payment callback could in theory be forged from the browser
console. **This is acceptable for demo/test mode only.** Before going live, add a backend
that: creates the Razorpay order, opens Checkout with that `order_id`, verifies
`razorpay_signature` server-side, and only then marks the ticket `PAID` and generates the
ticket number. Add a Razorpay webhook (`payment.captured`) as a backup for dropped
connections. The frontend's `src/services/payment/razorpay.ts` is the only file that would
need to change — its exported function signature stays the same.

## Printing

- Printing uses the browser's native print (`window.print` via `react-to-print`), so any
  printer installed on the counter PC works — thermal (58mm/80mm) or plain A4/A5.
- Paper size is chosen per machine at **Counter → Printer Settings** and stored in
  `localStorage` (not synced across machines).
- A ticket reprint is marked **"DUPLICATE COPY"** on the printout and logged in the audit log.

### Kiosk / silent printing at the counter

By default, the browser's print dialog opens automatically after a successful payment. To
skip that dialog entirely for one-click printing at a counter:

1. Set the thermal printer as the **Windows default printer** on that counter's PC.
2. Create a desktop shortcut that launches Chrome in kiosk printing mode pointed at this app:

   ```
   chrome.exe --kiosk-printing --app=https://<your-ticket-site-url>
   ```

3. Launch the app from that shortcut instead of a normal browser window. Every `window.print()`
   call will now print silently to the default printer with no dialog.

A later phase could add direct ESC/POS printing via QZ Tray or a local print agent for finer
control, but it isn't needed for this phase.

## Deploying to IIS (Windows Server)

This is a static Vite build, so it can be hosted on IIS as a static site:

```bash
npm run build        # outputs to dist/
```

Copy the contents of `dist/` to the IIS site's physical path. `public/web.config` is already
included in the build output and adds the URL-rewrite rule IIS needs so that React Router
routes (e.g. `/sa/dashboard`) don't 404 on a page refresh — it rewrites any request that
isn't an existing file or directory back to `index.html`. Make sure the IIS **URL Rewrite**
module is installed on the server (it's a free add-on from Microsoft, not installed by
default).

## Project structure

See `src/` — organized as `app/` (router, route guards), `layouts/`, `pages/` (by role),
`components/` (common, ticket, print, charts), `services/` (`api/` = the swappable service
layer, `mock/` = the localStorage-backed implementation + seed data, `payment/` = Razorpay),
`store/` (Zustand), `utils/` (billing math, formatting, validation), `constants/`, `types/`,
`i18n/` (English/Tamil resource files + setup — see "Language" above).

`src/utils/billing.ts` is the single source of truth for all tax/rounding math and is covered
by unit tests in `src/tests/billing.test.ts` — both the Issue Ticket screen and the print
layout call into it so totals never diverge.
