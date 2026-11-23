# TTDC Fair Ticketing — Counter Admin App (Flutter / Android POS)

**Purpose of this document:** this is a build brief for a *separate* Flutter project. Feed this whole file to Claude (or any AI coding agent) as the spec to generate the app. It describes **only the Counter Employee ("counter admin") ticket-issuing flow** — login, issue ticket, history, shift close, printer settings — ported from an existing React web POC (`ttdc-poc-ticket-web`) into a Flutter + `flutter_bloc` Android app meant to run on an Android POS/handheld terminal.

Out of scope for this app (do not build): Super Admin console, Sub Admin console, event/category/tax management screens, user management, reports dashboards, audit log viewer. Those stay in the web app. This app is a single-purpose ticket-counter terminal app.

---

## 1. Tech stack & architecture

- **Flutter** (stable channel), **Android only** target for v1 (no iOS constraints needed, but don't hard-block it either).
- **State management:** `flutter_bloc` (`Bloc`/`Cubit` + `Equatable`). One Bloc per screen/feature (see §7).
- **Local data store (no backend exists yet):** everything is **local-only on the device**, exactly like the web POC today (which uses `localStorage` as its only "backend"). Use **Drift** (SQLite) for the relational data (tickets, shifts, counters, categories, events, audit log) since reports/filters need real queries, plus `shared_preferences` or `flutter_secure_storage` for the session (logged-in user id, active counter id) and simple key-value settings (printer paper size).
- **Dependency injection:** `get_it` (simple service locator) or constructor injection via `RepositoryProvider`/`BlocProvider` — either is fine, prefer `get_it` for repositories/services and Bloc providers from `flutter_bloc` for the Blocs themselves.
- **Navigation:** `go_router`, with an auth guard redirect (see §6).
- **i18n:** `flutter_localizations` + `.arb` files, **English + Tamil** (the web app has full en/ta toggle — match that; see §9).
- **Money:** store and do all math in **integer paise** (never doubles/floats for money), exactly like the web app. Format for display with `intl`'s `NumberFormat.currency(locale: 'en_IN', symbol: '₹')`.
- **Repository pattern:** every data access goes through a repository interface (`AuthRepository`, `TicketRepository`, `CounterRepository`, `CategoryRepository`, `ShiftRepository`, `SettingsRepository`, `AuditLogRepository`). The *implementation* talks to Drift today. This indirection is what lets a future REST API implementation swap in later without touching any Bloc or UI code — don't skip it even though there's only one implementation right now.
- **Printing:** the device is an Android POS terminal, but the exact printer hardware/SDK (Sunmi, PAX, generic Bluetooth ESC/POS, etc.) **has not been decided yet**. Define a `PrinterService` abstract interface now (see §8) and ship **one concrete implementation using a generic Bluetooth/ESC-POS plugin** (e.g. `flutter_pos_printer_platform` or `esc_pos_bluetooth` + `esc_pos_utils`) as the default, so the app is runnable and testable today. Keep the interface vendor-agnostic so a built-in-terminal SDK implementation (Sunmi `sunmi_printer_plus`, PAX, etc.) can be dropped in later behind the same contract once hardware is chosen.

---

## 2. Roles & scope

The web app has 3 roles: `SUPER_ADMIN`, `SUB_ADMIN`, `COUNTER_EMPLOYEE`. **This Flutter app only implements `COUNTER_EMPLOYEE`.** Login must reject any user whose role isn't `COUNTER_EMPLOYEE` with a clear "This account cannot access the counter app" error — don't silently show an empty screen.

A `COUNTER_EMPLOYEE` user has a list of assigned counter IDs (`counterIds`). Each counter belongs to exactly one event. On login:
- If the user has exactly **1** assigned counter → go straight into that counter's session (skip picker).
- If the user has **2+** assigned counters → show an **Event/Counter Picker** screen to choose which one to operate as for this session.
- If the user has **0** assigned counters → show a "No counter assignments — contact your administrator" empty state, no way to proceed.

The chosen counter stays "active" for the session (persisted so re-opening the app keeps it) until the user explicitly switches or logs out.

---

## 3. Data model (Dart)

Mirror these shapes (field names/types kept close to the source TypeScript so nothing gets lost in translation). All money fields are `int` **paise**. All timestamps are ISO-8601 UTC strings or `DateTime`, your call — be consistent.

```dart
enum UserRole { superAdmin, subAdmin, counterEmployee }

class AppUser {
  final String id;
  final String name;
  final String username;
  final String passwordHash; // see §4 re: hashing vs plaintext for this POC
  final UserRole role;
  final List<String> counterIds;
  final String mobile;
  final String email;
  final bool active;
  final DateTime createdAt;
  final DateTime? lastLoginAt;
}

class Counter {
  final String id;
  final String eventId;
  final String code;           // e.g. "C01"
  final String name;           // e.g. "Main Gate"
  final String location;
  final List<PaymentMode> allowedPaymentModes;
  final String ticketPrefix;   // e.g. "TTF"
  final bool active;
}

class FairEvent {
  final String id;
  final String name;
  final String venue;
  final String city;
  final DateTime dateFrom;     // date only
  final DateTime dateTo;       // date only
  final String timingsStart;   // "10:00"
  final String timingsEnd;     // "20:00"
}

class TicketCategory {
  final String id;
  final String eventId;
  final String code;           // "ADT","CHD","SRC","STU","INF" etc — free-form, admin-defined
  final String name;
  final int price;             // paise
  final bool priceIncludesGst;
  final String ageRule;
  final bool isFree;
  final bool active;
  final int sortOrder;
}

enum PaymentMode { cash, upi, upiManual }
// cash      = CASH        -> fully working in this app
// upiManual = UPI_MANUAL  -> fully working (manual entry, no gateway)
// upi       = UPI (Razorpay in the web app) -> UI present, flow STUBBED (see §5.3)

enum TicketStatus { pending, paid, failed, cancelled }

class TicketItem {
  final String categoryId;
  final String name;
  final int qty;
  final int unitPrice;  // paise
  final int amount;     // paise = qty * unitPrice
}

class TaxSnapshot {
  final double gstRate;            // percent, e.g. 18
  final String pricingMode;        // 'INCLUSIVE' | 'EXCLUSIVE'
  final String splitType;          // 'CGST_SGST' | 'IGST'
}

class PaymentInfo {
  final String? razorpayPaymentId; // null unless/until online gateway is wired up later
  final int? cashReceived;         // paise
  final int? changeReturned;       // paise
  final String? upiManualRef;      // staff-entered UPI transaction ref
}

class ReprintEntry {
  final String byUserId;
  final String byUserName;
  final DateTime at;
  final String reason;
}

class Ticket {
  final String id;
  final String ticketNo;        // see §5.2 for format
  final String eventId;
  final String counterId;
  final String counterCode;
  final String issuedBy;        // userId
  final String issuedByName;
  final String visitorName;     // optional, may be ''
  final String visitorMobile;   // optional, may be ''
  final List<TicketItem> items;
  final int totalPersons;
  final int adults;
  final int children;
  final TaxSnapshot taxSnapshot;
  final int taxableValue;       // paise
  final int cgst;                // paise
  final int sgst;                // paise
  final int igst;                // paise
  final int roundOff;            // paise, can be negative
  final int totalAmount;         // paise, final amount charged
  final PaymentMode paymentMode;
  final PaymentInfo payment;
  final TicketStatus status;
  final int printCount;
  final List<ReprintEntry> reprints;
  final String? cancelledBy;
  final String? cancelReason;
  final DateTime createdAt;
}

class ShiftClose {
  final String id;
  final String userId;
  final String userName;
  final String counterId;
  final String counterCode;
  final DateTime date;          // the business date being closed
  final int systemCash;         // paise, computed from paid CASH tickets
  final int systemUpi;          // paise, computed from paid non-CASH tickets
  final int declaredCash;       // paise, staff-entered actual cash in hand
  final int difference;         // declaredCash - systemCash
  final int ticketCount;
  final int persons;
  final DateTime closedAt;
}

class TaxSettings {
  final bool gstEnabled;
  final double gstRate;         // e.g. 18
  final String splitType;       // 'CGST_SGST' | 'IGST'
  final String pricingMode;     // 'INCLUSIVE' | 'EXCLUSIVE'
  final String gstin;
  final String sacCode;
  final bool roundOff;
}

class GeneralSettings {
  final String logoUrl;
  final String footerText;
  final bool ticketValiditySameDayOnly;
  final String defaultPrinterSize; // '58mm' | '80mm' | 'A5' | 'A4'
}
```

These settings (`TaxSettings`, `GeneralSettings`, `Counter`, `TicketCategory`, `FairEvent`) are normally configured by Super Admin/Sub Admin in the web app. Since this Flutter app doesn't include those screens, **seed them locally** (see §4 sample data) so the counter app is immediately usable standalone. If/when a real backend exists, these become read-only data synced down to the device instead of locally seeded.

---

## 4. Auth & sample login credentials

Login screen: username + password fields, "Sign in" button, error banner on failure. On success, route based on role (only `counterEmployee` is supported — anything else shows the rejection message from §2).

**Auth rules (match the web POC exactly):**
- Username match is case-insensitive.
- Reject if user not found or password doesn't match → `"Invalid username or password"`.
- Reject if `active == false` → `"This account has been deactivated"`.
- On success: update `lastLoginAt`, persist a session (`userId`, `activeCounterId`) so the app stays logged in across restarts, write an audit log entry (`LOGIN` action) if you're keeping an audit log table — optional for v1, skip it if it adds no value since there's no Super Admin screen here to view it.

> Note on passwords: the web POC stores plaintext passwords in its mock data store (it's a disconnected demo with no real backend/security model). For this Flutter app, seed the same demo accounts the same way **for local testing purposes only** — do not treat this as a production auth design. If this app is ever pointed at a real backend, authentication must move to a proper hashed-password + token flow server-side; flag that explicitly in your implementation notes rather than silently leaving plaintext passwords in place.

### Sample users to seed for testing (mirrors the web POC's seed data)

| Name | Username | Password | Role | Assigned Counter(s) | Notes |
|---|---|---|---|---|---|
| Ravi Kumar | `counter1` | `counter123` | COUNTER_EMPLOYEE | C01 — Main Gate | Single counter → skips picker, goes straight to Issue Ticket |
| Priya S | `counter2` | `counter123` | COUNTER_EMPLOYEE | C02 — East Gate | Single counter |
| Mohan D | `counter3` | `counter123` | COUNTER_EMPLOYEE | C03 — West Gate | Single counter |
| TTDC Admin | `admin` | `admin123` | SUPER_ADMIN | — | **Use this to verify the role-rejection screen** — this app must refuse to let this login in |

If you want a test account with **multiple** counters (to exercise the Event/Counter Picker screen), add one more seeded user, e.g.:

| Name | Username | Password | Role | Assigned Counter(s) |
|---|---|---|---|---|
| Test MultiCounter | `counter_multi` | `counter123` | COUNTER_EMPLOYEE | C01 — Main Gate, C02 — East Gate |

### Sample seed data to ship with the app

**Event:**
- `TTDC Fair 2026`, venue `Island Grounds`, city `Chennai`, timings `10:00`–`20:00`.

**Counters (all belong to the event above):**

| Code | Name | Location | Allowed payment modes | Ticket prefix |
|---|---|---|---|---|
| C01 | Main Gate | Gate 1 | Cash, UPI, UPI Manual | TTF |
| C02 | East Gate | Gate 2 | Cash, UPI, UPI Manual | TTF |
| C03 | West Gate | Gate 3 | Cash, UPI, UPI Manual | TTF |

**Ticket categories (all belong to the event above):**

| Code | Name | Price (₹) | GST-inclusive | Age rule | Free? | Sort |
|---|---|---|---|---|---|---|
| ADT | Adult | 50.00 | Yes | 12 years & above | No | 1 |
| CHD | Child | 25.00 | Yes | 3 to 11 years | No | 2 |
| SRC | Senior Citizen | 30.00 | Yes | 60 years & above | No | 3 |
| STU | Student | 20.00 | Yes | With valid ID card | No | 4 |
| INF | Child Below 3 | 0.00 | Yes | Below 3 years | **Yes** | 5 |

**Tax settings:** GST enabled, rate 18%, split type CGST/SGST (9% + 9%), pricing mode INCLUSIVE (prices above already include GST), GSTIN `33AAAAA0000A1Z5`, SAC code `998553`, round-off enabled (round final total to nearest ₹1).

**General settings:** footer text `"Non-refundable ticket. Valid for single entry on date of issue."`, default printer size `80mm`.

---

## 5. Screen: Issue Ticket (the core screen)

This is the primary, highest-traffic screen — staff will use this hundreds of times a shift, so it must be fast and keyboard/barcode-scanner friendly where possible.

### 5.1 Layout

- **Visitor details (optional):** Name text field, 10-digit mobile text field. Mobile is optional but if entered must match Indian mobile format `^[6-9]\d{9}$` — validate and show inline error, don't block ticket issuance just because it's empty.
- **Ticket quantities:** one row per **active** category belonging to the active counter's event, sorted by `sortOrder`. Each row: category name + code + unit price (or "Free"), a stepper (−/qty/+), and the line amount. Cap total persons across all categories at **50** per ticket (configurable constant, not a hardcoded magic number buried in a widget).
- **Price summary panel:** live-updating breakdown — line items, taxable value, CGST/SGST (or IGST), round-off, **final total**, and total persons count. Recompute on every quantity change (see §5.2 for the exact math — do not approximate it with floating point).
- **Payment mode selector:** a segmented control showing only the counter's `allowedPaymentModes`. Labels: "Cash", "UPI (Razorpay)", "UPI (Manual Entry)".
  - **Cash** selected → show an "Amount received" numeric field + live "Change to return" display. If left blank, assume exact amount tendered (received = total, change = 0).
  - **UPI (Manual Entry)** selected → show a text field "UPI transaction reference" the staff fills in after the visitor pays via a separately-displayed QR/UPI ID (see §5.3) — no gateway call happens, it's just a recorded reference string.
  - **UPI (Razorpay)** selected → see §5.3, this one is stubbed.
- **Actions:** "Reset" button (clears the form) and "Confirm & Print" primary button (validates, saves the ticket, triggers printing). A "Reprint last ticket" text button, disabled until a ticket has been issued this session.

### 5.2 Billing & ticket-number math — implement exactly as specified

All amounts in **integer paise**, rounding with standard "round half away from zero" at each step (Dart: `(x).round()` on a double is fine for this use case since you're rounding small/medium integers-as-doubles, but prefer doing the arithmetic in integers wherever possible and only introduce `/100` divisions at the final display step).

```
For each selected category line:
  amount = qty * unitPrice   // unitPrice already in paise; free categories use unitPrice 0

grossLineSum = sum of all line amounts
totalPersons = sum of all line quantities

if GST disabled OR gstRate == 0:
  taxableValue = grossLineSum
  gstAmount    = 0
  grossTotal   = grossLineSum
else if pricingMode == INCLUSIVE:
  grossTotal    = grossLineSum
  taxableValue  = round(grossTotal / (1 + gstRate/100))
  gstAmount     = grossTotal - taxableValue
else // EXCLUSIVE
  taxableValue  = grossLineSum
  gstAmount     = round(taxableValue * gstRate/100)
  grossTotal    = taxableValue + gstAmount

if gstAmount > 0:
  if splitType == CGST_SGST:
    cgst = round(gstAmount / 2)
    sgst = gstAmount - cgst       // remainder absorbs the odd paise, never both rounded up
  else: // IGST
    igst = gstAmount
else:
  cgst = sgst = igst = 0

if roundOff setting enabled:
  roundedRupees = round(grossTotal / 100) * 100   // nearest whole rupee, in paise
  roundOffAmount = roundedRupees - grossTotal       // can be negative
  finalTotal = roundedRupees
else:
  roundOffAmount = 0
  finalTotal = grossTotal
```

**Ticket number format:** `{ticketPrefix}-{counterCode}-{YYYYMMDD}-{4-digit sequence}`, e.g. `TTF-C01-20261119-0007`. The sequence is **per counter, per calendar day**, starting at 1, zero-padded to 4 digits, and must be gap-free and never reused — increment it atomically at the moment a ticket is actually saved (not when the form is opened), stored as a simple `(counterId, dateYmd) -> lastSeq` map in the local DB.

**Keyboard shortcuts (nice-to-have, match the web POC's counter staff muscle memory):** `F2` = reset form, `F9` = select Cash (press again to confirm & print), `F10` = select UPI. These assume a physical/attached keyboard; if the target POS terminal is touch-only, these are optional — don't block the build on them, but wire them up if a `HardwareKeyboard` listener is trivial to add.

### 5.3 Payment mode behavior — this is the one place "cash only for now" applies

- **Cash:** fully functional. Validate `cashReceived >= finalTotal` before allowing confirm (if the field was left blank, treat received as exactly `finalTotal`). On confirm: save `PaymentInfo(cashReceived, changeReturned: received - finalTotal, razorpayPaymentId: null, upiManualRef: null)`, `paymentMode = cash`, `status = paid`.
- **UPI (Manual Entry):** fully functional, no gateway/SDK needed. Staff shows the visitor a UPI QR code or ID (can be a static image/config value in Settings, out of scope to make dynamic right now) and, once paid, types in the transaction reference number into a text field. On confirm: save `PaymentInfo(upiManualRef: <entered text>, cashReceived: null, changeReturned: null, razorpayPaymentId: null)`, `paymentMode = upiManual`, `status = paid`. Require the reference field to be non-empty before allowing confirm.
- **UPI (Razorpay):** **keep the option visible** in the selector (don't hide/remove it — the counter and its `allowedPaymentModes` config should still be able to include it, and staff should see it exists), but tapping it shows an info dialog: *"Online payment is not available on this device yet. Please use Cash or Manual UPI Entry."* and does **not** let the user proceed to Confirm & Print while it's selected. Structure the code so that a future real integration only has to implement one method (e.g. `Future<RazorpayResult> payWithRazorpay(...)` behind a `PaymentGateway` interface) and flip this gate open — don't delete the UI path, just gate it.

### 5.4 On confirm & print

1. Re-validate (persons ≥ 1, persons ≤ 50, mobile format if provided, payment mode selected and its required fields filled).
2. Generate ticket number (§5.2), build the `Ticket` record with `status = paid`, `printCount = 1`, save it to the local DB.
3. Send it to `PrinterService.printTicket(ticket, event, generalSettings, paperSize)` (see §8).
4. Reset the form, keep the just-issued ticket referenced for the "Reprint last ticket" button.
5. Surface print failures as a non-blocking banner — the ticket is already saved/valid even if the physical printer failed (staff can reprint from History).

---

## 6. Other screens

### 6.1 Event/Counter Picker
Shown only when the logged-in user has 2+ assigned counters and no active counter chosen yet for this session. List each assignment as a card: event name, counter code + name. Tapping one sets it as the active counter and proceeds into the app. A "Switch counter" action should be reachable from the main app bar/menu to come back here.

### 6.2 History
- Header KPI row for **today only, this counter**: ticket count, adults/children split, cash total, UPI total (cash + non-cash combined distinctly), grand total.
- Search box filtering by ticket number, visitor name, or visitor mobile (across all dates, not just today).
- Table/list of tickets (ticket no, date/time, visitor masked-mobile, persons, total, payment mode, status) newest first.
- Per-row actions: **View** (→ Ticket Detail) and **Reprint** (only for `paid` tickets) — reprint opens a small dialog asking for an optional reason, then increments `printCount`, appends a `ReprintEntry`, and reprints via `PrinterService` with a "DUPLICATE COPY" banner on the receipt.
- Mask mobile numbers in all list/detail views: show first 2 and last 2 digits, middle replaced with `XXXXXX` (e.g. `98XXXXXX23`).

### 6.3 Ticket Detail
Full breakdown of a single ticket (same fields as the receipt: items, taxable value, CGST/SGST/IGST, total, payment mode + reference if any, print count, cancel reason if cancelled). Reprint button for `paid` tickets, same reason-dialog flow as History.

*(Cancel-ticket is a Super Admin/Sub Admin action in the web app — not exposed to counter staff there either, so don't add a cancel button here. If a ticket shows status `cancelled`/`failed`, just display it as read-only.)*

### 6.4 Shift Close
- Shows today's **system totals** for this counter/user: tickets issued, persons, system cash total, system UPI total (computed live from today's `paid` tickets).
- Staff enters **actual cash in hand** (declared cash) → live difference indicator: exact match (success), excess (info), short (warning), formatted as currency.
- "Close Shift" button saves a `ShiftClose` record (system totals + declared + difference, timestamped) and switches the screen to a read-only "closed" confirmation with a "Print summary" button (prints a shift report, not a ticket receipt — simpler layout, see §8).
- Once closed for the day, re-opening this screen for the same counter/date should show the already-closed summary rather than letting staff declare cash twice — decide whether a shift can be closed more than once a day for this app's purposes; default to **allow re-closing** (append a new `ShiftClose` row) since the web POC doesn't block it either, but flag this as a deliberate simplification in your notes.

### 6.5 Printer Settings
Single dropdown: paper size (`58mm`, `80mm`, `A5`, `A4`). Persist the choice locally; it drives both the page layout math in `PrinterService` and any on-screen receipt preview.

### 6.6 App shell / navigation
Bottom navigation or a side rail (pick whichever fits a POS touchscreen better — bottom nav is usually friendlier on handheld terminals) with 4 destinations: **Issue Ticket**, **History**, **Shift Close**, **Settings**. Top app bar shows: event name + counter code/name, logged-in user's name/avatar initial, a live clock, language switcher (EN/TA), theme toggle (light/dark), and logout.

---

## 7. Bloc structure

One Bloc/Cubit per screen is enough granularity — don't over-split into a Bloc per widget.

- **`AuthBloc`** — events: `AuthStarted` (check for existing session on app boot), `LoginSubmitted(username, password)`, `LogoutRequested`, `ActiveCounterChanged(counterId)`. States: `AuthInitial`, `AuthLoading`, `AuthAuthenticated(user, activeCounterId)`, `AuthUnauthenticated`, `AuthFailure(message)`.
- **`IssueTicketBloc`** (or `Cubit` — this one is mostly simple state replacement, a `Cubit` is fine) — holds the in-progress draft (quantities map, visitor fields, payment mode, cash received/upi ref), recomputes billing on every change, exposes a derived `BillingResult`. Events/methods: `updateQuantity(categoryId, qty)`, `updateVisitorDetails(...)`, `selectPaymentMode(mode)`, `updateCashReceived(value)`, `updateUpiManualRef(value)`, `resetForm()`, `confirmAndPrint()`. States should carry enough to re-render the whole screen plus a `submitting` flag and a `lastIssuedTicket` for the reprint button.
- **`HistoryBloc`** — events: `HistoryLoaded`, `SearchChanged(query)`, `ReprintRequested(ticketId, reason)`. States carry the ticket list + today's KPI summary.
- **`TicketDetailBloc`** or just a simple `FutureBuilder`/repository call — this screen is nearly stateless (load by id, optional reprint), a full Bloc is optional here.
- **`ShiftCloseBloc`** — events: `ShiftTotalsLoaded`, `DeclaredCashChanged(value)`, `CloseShiftRequested`. States: totals + computed difference + closed/not-closed.
- **`PrinterSettingsCubit`** — trivial: current paper size + `setPaperSize(size)`.

Keep all billing math (§5.2) in a **pure, framework-free Dart function** (e.g. `BillingCalculator.calculate(lines, taxSettings)`) that Blocs call — mirrors the web POC's `utils/billing.ts`, which both the Issue Ticket screen and the print layout import from so totals can never diverge between what's shown and what's printed. Write unit tests directly against this function (inclusive vs exclusive pricing, CGST/SGST split with an odd paise amount, round-off on/off, zero-GST case).

---

## 8. Printer abstraction

```dart
abstract class PrinterService {
  Future<void> printTicket({
    required Ticket ticket,
    required FairEvent event,
    required GeneralSettings general,
    required String paperSize, // '58mm' | '80mm' | 'A5' | 'A4'
    bool isDuplicate = false,
  });

  Future<void> printShiftSummary(ShiftClose shift, FairEvent event);

  Future<bool> isConnected();
}
```

**Receipt content (ticket)** — reproduce every line from the web POC's receipt, in this order: event name + venue + timings header → divider → ticket no / date-time / counter code / issued-by / visitor name (if any) / masked visitor mobile (if any) → divider → item table (name, qty, rate, amount) → divider → taxable value → CGST line (if >0) → SGST line (if >0) → IGST line (if >0) → round-off line (if ≠0) → **bold total line** → persons line ("X persons (A: adults, C: children)") → paid-by line (payment mode label + reference if any) → divider → QR code encoding the ticket number → footer (validity notice, configured footer text, thank-you line). If `isDuplicate`, print a "DUPLICATE COPY" banner at the very top.

For `58mm`/`80mm` paper, lay out as a narrow receipt (no fixed page margins, just the paper width). For `A5`/`A4`, it can render as a fuller-page layout — these larger sizes matter less for a handheld POS printer but keep the option since the counter app inherits the same `defaultPrinterSize` setting as the rest of the system.

Since the concrete printer hardware isn't chosen yet, ship a default implementation over a generic Bluetooth ESC/POS plugin, and make sure `printTicket`/`printShiftSummary` are the **only** methods any screen ever calls — no screen should import a vendor SDK directly. When hardware is finalized, only this one implementation file needs to change.

---

## 9. i18n

Support English and Tamil, switchable at runtime (persist the choice), exactly matching the web app's toggle behavior. Keys you'll need at minimum (name them however fits your `.arb` convention, but cover all of these concepts): sign in / username / password / invalid credentials / account deactivated, issue ticket screen (visitor details, ticket quantities, payment mode, cash/upi/upi-manual labels, amount received, change to return, insufficient cash error, confirm & print, reset, reprint last ticket, add-at-least-one-person error, max-persons error, invalid mobile error, select-payment-mode error, taxable value / CGST / SGST / IGST / round-off / total labels), history screen (today's tickets, adults/children, cash, upi, total, search placeholder, ticket no / date-time / visitor / persons / total / mode / status / actions columns, reprint dialog text), ticket detail labels, shift close screen (today's system totals, tickets issued, persons, system cash, system UPI, actual cash in hand, cash matches / excess of / short by, close shift, print summary), printer settings (paper size), common (name, mobile, back, cancel, logout, reason optional).

---

## 10. Non-functional requirements

- **Offline-first by construction** — there's no network dependency for this v1 (see §1), so "offline support" isn't an added feature, it's just the default. Don't add any code that assumes connectivity.
- **Fast input** on a touch/handheld device: large tap targets for the quantity steppers and payment mode buttons (this is used all day by counter staff, not browsed casually).
- **Resilience:** if the app is killed/restarted mid-shift, the active counter, logged-in session, and all issued tickets/sequence counters must survive (they're in the local DB/persisted session, not in-memory-only state).
- **Data integrity:** ticket numbering must never skip or duplicate even if two confirm-taps race (debounce the Confirm & Print button / disable it while `submitting` is true, and make the sequence-increment a single atomic DB transaction).

---

## 11. Explicitly out of scope for this build

- Razorpay / any real online payment gateway integration (stubbed per §5.3).
- Any backend/REST API (local DB only, per §1 — revisit if/when a backend gets built).
- Super Admin, Sub Admin consoles: event management, category/pricing management, tax settings management, counter/user management, reports (transactions/counters/GST/shifts), audit log viewer.
- Ticket cancellation (counter staff can't cancel in the web app either; this app matches that).
- Choosing/integrating a specific POS printer SDK — that's a config swap behind `PrinterService` once hardware is finalized (§8).

---

## 12. Acceptance checklist

- [ ] Login rejects non-`COUNTER_EMPLOYEE` roles with a clear message; accepts the seeded `counter1`/`counter2`/`counter3` accounts.
- [ ] Single-counter users skip the picker; multi-counter users see it; zero-counter users see the empty state.
- [ ] Issue Ticket: quantities update the price summary live and match the §5.2 formulas exactly (write unit tests against the sample categories/tax settings in §4 and hand-check a few expected totals).
- [ ] Cash payment: validates sufficient amount, computes correct change, saves + prints successfully.
- [ ] UPI Manual payment: requires a reference string, saves + prints successfully, no gateway call attempted.
- [ ] UPI (Razorpay) option is visible but blocked with the "not available yet" message; cannot complete a sale through it.
- [ ] Ticket numbers are sequential per counter per day, zero-padded, gap-free, in the exact `{prefix}-{counterCode}-{YYYYMMDD}-{seq}` format.
- [ ] History shows correct today-KPIs and lets you search/view/reprint; reprint increments `printCount` and marks the receipt "DUPLICATE COPY".
- [ ] Shift Close computes system cash/UPI correctly from today's paid tickets and lets staff declare cash with a correct match/excess/short indicator.
- [ ] Printer settings paper size change is reflected in the receipt layout.
- [ ] English/Tamil toggle covers every screen in this app with no missing keys.
- [ ] App survives a force-close mid-shift with no data loss and no ticket-number gaps/dupes.
