import dayjs from 'dayjs';
import type { Counter, Event, GeneralSettings, TaxSettings, Ticket, TicketCategory, User } from '../../types/models';
import { calculateBilling } from '../../utils/billing';
import { formatTicketNo } from '../../utils/ticketNumber';
import { genId, hasAnyData, markSeeded, readCollection, readValue, writeCollection, writeValue } from './storage';

const EVENT_1: Event = {
  id: 'ev1',
  name: 'TTDC Fair 2026',
  venue: 'Island Grounds',
  city: 'Chennai',
  dateFrom: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
  dateTo: dayjs().add(10, 'day').format('YYYY-MM-DD'),
  timingsStart: '10:00',
  timingsEnd: '20:00',
  createdBy: null,
  createdAt: dayjs().subtract(20, 'day').toISOString(),
};

const CATEGORIES: TicketCategory[] = [
  {
    id: 'cat_adult',
    eventId: EVENT_1.id,
    code: 'ADT',
    name: 'Adult',
    price: 5000,
    priceIncludesGst: true,
    ageRule: '12 years & above',
    isFree: false,
    active: true,
    sortOrder: 1,
    effectiveFrom: null,
    effectiveTo: null,
  },
  {
    id: 'cat_child',
    eventId: EVENT_1.id,
    code: 'CHD',
    name: 'Child',
    price: 2500,
    priceIncludesGst: true,
    ageRule: '3 to 11 years',
    isFree: false,
    active: true,
    sortOrder: 2,
    effectiveFrom: null,
    effectiveTo: null,
  },
  {
    id: 'cat_senior',
    eventId: EVENT_1.id,
    code: 'SRC',
    name: 'Senior Citizen',
    price: 3000,
    priceIncludesGst: true,
    ageRule: '60 years & above',
    isFree: false,
    active: true,
    sortOrder: 3,
    effectiveFrom: null,
    effectiveTo: null,
  },
  {
    id: 'cat_student',
    eventId: EVENT_1.id,
    code: 'STU',
    name: 'Student',
    price: 2000,
    priceIncludesGst: true,
    ageRule: 'With valid ID card',
    isFree: false,
    active: true,
    sortOrder: 4,
    effectiveFrom: null,
    effectiveTo: null,
  },
  {
    id: 'cat_infant',
    eventId: EVENT_1.id,
    code: 'INF',
    name: 'Child Below 3',
    price: 0,
    priceIncludesGst: true,
    ageRule: 'Below 3 years',
    isFree: true,
    active: true,
    sortOrder: 5,
    effectiveFrom: null,
    effectiveTo: null,
  },
];

const COUNTERS: Counter[] = [
  { id: 'c1', eventId: EVENT_1.id, code: 'C01', name: 'Main Gate', location: 'Gate 1', allowedPaymentModes: ['CASH', 'UPI'], ticketPrefix: 'TTF', active: true },
  { id: 'c2', eventId: EVENT_1.id, code: 'C02', name: 'East Gate', location: 'Gate 2', allowedPaymentModes: ['CASH', 'UPI'], ticketPrefix: 'TTF', active: true },
  { id: 'c3', eventId: EVENT_1.id, code: 'C03', name: 'West Gate', location: 'Gate 3', allowedPaymentModes: ['CASH', 'UPI'], ticketPrefix: 'TTF', active: true },
];

const USERS: User[] = [
  {
    id: 'u_admin',
    name: 'TTDC Admin',
    username: 'admin',
    password: 'admin123',
    role: 'SUPER_ADMIN',
    counterIds: [],
    mobile: '9840000001',
    email: 'admin@ttdc.local',
    active: true,
    createdBy: null,
    createdAt: dayjs().subtract(30, 'day').toISOString(),
    lastLoginAt: null,
  },
  {
    id: 'u_subadmin1',
    name: 'Event Manager',
    username: 'manager1',
    password: 'manager123',
    role: 'SUB_ADMIN',
    counterIds: [],
    mobile: '9840000005',
    email: 'manager1@ttdc.local',
    active: true,
    createdBy: 'u_admin',
    createdAt: dayjs().subtract(15, 'day').toISOString(),
    lastLoginAt: null,
  },
  {
    id: 'u1',
    name: 'Ravi Kumar',
    username: 'counter1',
    password: 'counter123',
    role: 'COUNTER_EMPLOYEE',
    counterIds: ['c1'],
    mobile: '9840000002',
    email: 'ravi.kumar@ttdc.local',
    active: true,
    createdBy: null,
    createdAt: dayjs().subtract(20, 'day').toISOString(),
    lastLoginAt: null,
  },
  {
    id: 'u2',
    name: 'Priya S',
    username: 'counter2',
    password: 'counter123',
    role: 'COUNTER_EMPLOYEE',
    counterIds: ['c2'],
    mobile: '9840000003',
    email: 'priya.s@ttdc.local',
    active: true,
    createdBy: null,
    createdAt: dayjs().subtract(20, 'day').toISOString(),
    lastLoginAt: null,
  },
  {
    id: 'u3',
    name: 'Mohan D',
    username: 'counter3',
    password: 'counter123',
    role: 'COUNTER_EMPLOYEE',
    counterIds: ['c3'],
    mobile: '9840000004',
    email: 'mohan.d@ttdc.local',
    active: true,
    createdBy: null,
    createdAt: dayjs().subtract(20, 'day').toISOString(),
    lastLoginAt: null,
  },
];

const TAX_SETTINGS: TaxSettings = {
  gstEnabled: true,
  gstRate: 18,
  splitType: 'CGST_SGST',
  pricingMode: 'INCLUSIVE',
  gstin: '33AAAAA0000A1Z5',
  sacCode: '998553',
  roundOff: true,
};

const GENERAL_SETTINGS: GeneralSettings = {
  logoUrl: '',
  footerText: 'Non-refundable ticket. Valid for single entry on date of issue.',
  ticketValiditySameDayOnly: true,
  defaultPrinterSize: '80mm',
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function buildSampleTickets(): Ticket[] {
  const tickets: Ticket[] = [];
  const paidCategories = CATEGORIES.filter((c) => !c.isFree);
  const days = 7;

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const day = dayjs().subtract(dayOffset, 'day');
    const dateYmd = day.format('YYYYMMDD');
    const ticketsToday = randomInt(22, 32);

    for (const counter of COUNTERS) {
      let seq = 0;
      const user = USERS.find((u) => u.counterIds.includes(counter.id))!;
      const perCounter = Math.round(ticketsToday / COUNTERS.length);

      for (let i = 0; i < perCounter; i++) {
        seq += 1;
        const adultCat = CATEGORIES.find((c) => c.code === 'ADT')!;
        const childCat = CATEGORIES.find((c) => c.code === 'CHD')!;
        const extraCat = pick(paidCategories);

        const adults = randomInt(0, 3);
        const children = randomInt(0, 2);
        const extras = Math.random() < 0.2 ? randomInt(1, 2) : 0;
        const adultQty = adults === 0 && children === 0 ? 1 : adults;

        const lines = [
          { categoryId: adultCat.id, name: adultCat.name, qty: adultQty, unitPrice: adultCat.price },
          { categoryId: childCat.id, name: childCat.name, qty: children, unitPrice: childCat.price },
          ...(extras > 0 ? [{ categoryId: extraCat.id, name: extraCat.name, qty: extras, unitPrice: extraCat.price }] : []),
        ].filter((l) => l.qty > 0);

        const billing = calculateBilling(lines, TAX_SETTINGS);
        const hour = randomInt(10, 19);
        const minute = randomInt(0, 59);
        const createdAt = day.hour(hour).minute(minute).second(0).toISOString();

        const isUpi = Math.random() < 0.45;
        const outcomeRoll = Math.random();
        const status: Ticket['status'] = outcomeRoll < 0.04 ? 'FAILED' : outcomeRoll < 0.07 ? 'CANCELLED' : 'PAID';

        const ticket: Ticket = {
          id: genId('t'),
          ticketNo: formatTicketNo(counter.ticketPrefix, counter.code, dateYmd, seq),
          eventId: counter.eventId,
          counterId: counter.id,
          counterCode: counter.code,
          issuedBy: user.id,
          issuedByName: user.name,
          visitorName: '',
          visitorMobile: Math.random() < 0.3 ? `9${randomInt(100000000, 999999999)}` : '',
          items: billing.items,
          totalPersons: billing.totalPersons,
          adults: adultQty,
          children,
          taxSnapshot: {
            gstRate: TAX_SETTINGS.gstRate,
            pricingMode: TAX_SETTINGS.pricingMode,
            splitType: TAX_SETTINGS.splitType,
          },
          taxableValue: billing.taxableValue,
          cgst: billing.cgst,
          sgst: billing.sgst,
          igst: billing.igst,
          roundOff: billing.roundOff,
          totalAmount: billing.finalTotal,
          paymentMode: isUpi ? 'UPI' : 'CASH',
          payment: {
            razorpayPaymentId: status === 'PAID' && isUpi ? `pay_${genId('mock').slice(-12)}` : null,
            razorpayOrderId: null,
            cashReceived: status === 'PAID' && !isUpi ? billing.finalTotal : null,
            changeReturned: status === 'PAID' && !isUpi ? 0 : null,
            upiManualRef: null,
          },
          status,
          printCount: status === 'PAID' ? 1 : 0,
          reprints: [],
          cancelledBy: status === 'CANCELLED' ? user.id : null,
          cancelReason: status === 'CANCELLED' ? 'Visitor requested refund before entry' : null,
          createdAt,
        };

        tickets.push(ticket);
      }
    }
  }

  return tickets;
}

// Pre-existing browsers may still have users saved under the old schema
// (a single `counterId` instead of `counterIds: []`). Backfill those in place
// so `.length`/`.map`/`.includes` calls on `counterIds` elsewhere don't crash.
export function migrateLegacyUsers(): void {
  const users = readCollection<Record<string, unknown>>('users');
  if (users.length === 0) return;

  let changed = false;
  const migrated = users.map((u) => {
    if (Array.isArray(u.counterIds)) return u;
    changed = true;
    const legacyCounterId = typeof u.counterId === 'string' ? u.counterId : null;
    const { counterId: _counterId, ...rest } = u;
    return { ...rest, counterIds: legacyCounterId ? [legacyCounterId] : [] };
  });

  if (changed) writeCollection('users', migrated);
}

// Backfill `city`/`createdBy` on events saved before those fields existed.
export function migrateLegacyEvents(): void {
  const events = readCollection<Record<string, unknown>>('events');
  if (events.length === 0) return;

  let changed = false;
  const migrated = events.map((e) => {
    if (typeof e.city === 'string' && 'createdBy' in e) return e;
    changed = true;
    return { ...e, city: typeof e.city === 'string' ? e.city : '', createdBy: 'createdBy' in e ? e.createdBy : null };
  });

  if (changed) writeCollection('events', migrated);
}

// Backfill `eventId` on categories saved before prices became per-event —
// attach them to the earliest existing event (historically there was only one).
export function migrateLegacyCategories(): void {
  const categories = readCollection<Record<string, unknown>>('categories');
  if (categories.length === 0) return;

  const needsMigration = categories.some((c) => typeof c.eventId !== 'string');
  if (!needsMigration) return;

  const events = readCollection<Event>('events');
  const fallbackEventId = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]?.id ?? '';

  const migrated = categories.map((c) => (typeof c.eventId === 'string' ? c : { ...c, eventId: fallbackEventId }));
  writeCollection('categories', migrated);
}

// One-time only: before this role existed, every non-super-admin user was a
// ticket-issuing counter login stored as SUB_ADMIN. Convert those to the new
// COUNTER_EMPLOYEE role exactly once, so future, genuinely-new SUB_ADMIN
// (manager) accounts are never swept up by this on a later boot.
export function migrateCounterEmployeeRole(): void {
  const MIGRATION_FLAG = 'migrated_role_v2';
  if (readValue(MIGRATION_FLAG, false)) return;

  const users = readCollection<Record<string, unknown>>('users');
  const migrated = users.map((u) => (u.role === 'SUB_ADMIN' ? { ...u, role: 'COUNTER_EMPLOYEE' } : u));
  writeCollection('users', migrated);
  writeValue(MIGRATION_FLAG, true);
}

export function seedIfEmpty(): void {
  if (hasAnyData()) return;

  writeCollection('events', [EVENT_1]);
  writeCollection('users', USERS);
  writeCollection('counters', COUNTERS);
  writeCollection('categories', CATEGORIES);
  writeValue('taxSettings', TAX_SETTINGS);
  writeValue('generalSettings', GENERAL_SETTINGS);
  writeCollection('tickets', buildSampleTickets());
  writeCollection('shifts', []);
  writeCollection('auditLogs', []);
  writeValue('ticketSequences', {} as Record<string, number>);

  // A fresh seed has no legacy SUB_ADMIN-as-ticket-issuer data to convert —
  // mark the one-time role migration as already satisfied so it never
  // mistakes the newly-seeded (genuine) manager account for a legacy one.
  writeValue('migrated_role_v2', true);

  markSeeded();
}
