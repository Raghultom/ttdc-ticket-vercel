import dayjs from 'dayjs';
import type { Counter, Event, Ticket, TicketFilters, User } from '../../types/models';
import { readCollection, simulateLatency } from '../mock/storage';
import { list as listTickets } from './tickets';

export interface DashboardSummary {
  totalRevenue: number;
  cashTotal: number;
  upiTotal: number;
  totalTickets: number;
  totalVisitors: number;
  adults: number;
  children: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  gstTotal: number;
  cancelledCount: number;
  cancelledAmount: number;
}

export interface GroupSummaryRow {
  key: string;
  label: string;
  subLabel: string;
  tickets: number;
  adults: number;
  children: number;
  cash: number;
  upi: number;
  total: number;
  gst: number;
}

export interface HourlyRevenuePoint {
  hour: number;
  label: string;
  revenue: number;
}

export interface CategoryBreakdownRow {
  categoryId: string;
  name: string;
  persons: number;
}

export async function categoryBreakdown(filters: TicketFilters = {}): Promise<CategoryBreakdownRow[]> {
  const all = paidOnly(await listTickets(filters));
  const rows = new Map<string, CategoryBreakdownRow>();

  for (const t of all) {
    for (const item of t.items) {
      if (item.qty <= 0) continue;
      const row = rows.get(item.categoryId) ?? { categoryId: item.categoryId, name: item.name, persons: 0 };
      row.persons += item.qty;
      rows.set(item.categoryId, row);
    }
  }

  return simulateLatency([...rows.values()].sort((a, b) => b.persons - a.persons));
}

export interface GstReportRow {
  date: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

function paidOnly(tickets: Ticket[]): Ticket[] {
  return tickets.filter((t) => t.status === 'PAID');
}

export async function dashboardSummary(filters: TicketFilters = {}): Promise<DashboardSummary> {
  const all = await listTickets(filters);
  const paid = paidOnly(all);
  const cancelled = all.filter((t) => t.status === 'CANCELLED');

  const summary: DashboardSummary = {
    totalRevenue: paid.reduce((s, t) => s + t.totalAmount, 0),
    cashTotal: paid.filter((t) => t.paymentMode === 'CASH').reduce((s, t) => s + t.totalAmount, 0),
    upiTotal: paid.filter((t) => t.paymentMode !== 'CASH').reduce((s, t) => s + t.totalAmount, 0),
    totalTickets: paid.length,
    totalVisitors: paid.reduce((s, t) => s + t.totalPersons, 0),
    adults: paid.reduce((s, t) => s + t.adults, 0),
    children: paid.reduce((s, t) => s + t.children, 0),
    cgstTotal: paid.reduce((s, t) => s + t.cgst, 0),
    sgstTotal: paid.reduce((s, t) => s + t.sgst, 0),
    igstTotal: paid.reduce((s, t) => s + t.igst, 0),
    gstTotal: paid.reduce((s, t) => s + t.cgst + t.sgst + t.igst, 0),
    cancelledCount: cancelled.length,
    cancelledAmount: cancelled.reduce((s, t) => s + t.totalAmount, 0),
  };

  return simulateLatency(summary);
}

export async function counterSummary(filters: TicketFilters = {}): Promise<GroupSummaryRow[]> {
  const all = paidOnly(await listTickets(filters));
  const counters = readCollection<Counter>('counters');

  const rows = new Map<string, GroupSummaryRow>();
  for (const t of all) {
    const row = rows.get(t.counterId) ?? {
      key: t.counterId,
      label: counters.find((c) => c.id === t.counterId)?.name ?? t.counterCode,
      subLabel: counters.find((c) => c.id === t.counterId)?.code ?? t.counterCode,
      tickets: 0,
      adults: 0,
      children: 0,
      cash: 0,
      upi: 0,
      total: 0,
      gst: 0,
    };
    row.tickets += 1;
    row.adults += t.adults;
    row.children += t.children;
    row.cash += t.paymentMode === 'CASH' ? t.totalAmount : 0;
    row.upi += t.paymentMode !== 'CASH' ? t.totalAmount : 0;
    row.total += t.totalAmount;
    row.gst += t.cgst + t.sgst + t.igst;
    rows.set(t.counterId, row);
  }

  return simulateLatency([...rows.values()].sort((a, b) => a.subLabel.localeCompare(b.subLabel)));
}

export async function eventSummary(filters: TicketFilters = {}): Promise<GroupSummaryRow[]> {
  const all = paidOnly(await listTickets(filters));
  const events = readCollection<Event>('events');

  const rows = new Map<string, GroupSummaryRow>();
  for (const t of all) {
    const event = events.find((e) => e.id === t.eventId);
    const row = rows.get(t.eventId) ?? {
      key: t.eventId,
      label: event?.name ?? t.eventId,
      subLabel: event?.city ?? '',
      tickets: 0,
      adults: 0,
      children: 0,
      cash: 0,
      upi: 0,
      total: 0,
      gst: 0,
    };
    row.tickets += 1;
    row.adults += t.adults;
    row.children += t.children;
    row.cash += t.paymentMode === 'CASH' ? t.totalAmount : 0;
    row.upi += t.paymentMode !== 'CASH' ? t.totalAmount : 0;
    row.total += t.totalAmount;
    row.gst += t.cgst + t.sgst + t.igst;
    rows.set(t.eventId, row);
  }

  return simulateLatency([...rows.values()].sort((a, b) => a.label.localeCompare(b.label)));
}

export async function userSummary(filters: TicketFilters = {}): Promise<GroupSummaryRow[]> {
  const all = paidOnly(await listTickets(filters));
  const users = readCollection<User>('users');

  const rows = new Map<string, GroupSummaryRow>();
  for (const t of all) {
    const row = rows.get(t.issuedBy) ?? {
      key: t.issuedBy,
      label: users.find((u) => u.id === t.issuedBy)?.name ?? t.issuedByName,
      subLabel: t.counterCode,
      tickets: 0,
      adults: 0,
      children: 0,
      cash: 0,
      upi: 0,
      total: 0,
      gst: 0,
    };
    row.tickets += 1;
    row.adults += t.adults;
    row.children += t.children;
    row.cash += t.paymentMode === 'CASH' ? t.totalAmount : 0;
    row.upi += t.paymentMode !== 'CASH' ? t.totalAmount : 0;
    row.total += t.totalAmount;
    row.gst += t.cgst + t.sgst + t.igst;
    rows.set(t.issuedBy, row);
  }

  return simulateLatency([...rows.values()].sort((a, b) => a.label.localeCompare(b.label)));
}

export async function hourlyRevenue(filters: TicketFilters = {}): Promise<HourlyRevenuePoint[]> {
  const all = paidOnly(await listTickets(filters));
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: dayjs().hour(hour).minute(0).format('h A'),
    revenue: 0,
  }));

  for (const t of all) {
    const hour = dayjs(t.createdAt).hour();
    buckets[hour].revenue += t.totalAmount;
  }

  return simulateLatency(buckets.filter((b) => b.hour >= 6 && b.hour <= 22));
}

export async function gstReport(filters: TicketFilters = {}): Promise<GstReportRow[]> {
  const all = paidOnly(await listTickets(filters));
  const rows = new Map<string, GstReportRow>();

  for (const t of all) {
    const date = dayjs(t.createdAt).format('YYYY-MM-DD');
    const row = rows.get(date) ?? { date, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
    row.taxableValue += t.taxableValue;
    row.cgst += t.cgst;
    row.sgst += t.sgst;
    row.igst += t.igst;
    row.total += t.totalAmount;
    rows.set(date, row);
  }

  return simulateLatency([...rows.values()].sort((a, b) => a.date.localeCompare(b.date)));
}

export interface TransactionExportRow {
  'Ticket No': string;
  Date: string;
  Time: string;
  Counter: string;
  'Issued By': string;
  Items: string;
  Adults: number;
  Children: number;
  Persons: number;
  'Taxable Value': number;
  CGST: number;
  SGST: number;
  IGST: number;
  'Round Off': number;
  Total: number;
  'Payment Mode': string;
  Status: string;
}

export async function exportTransactions(filters: TicketFilters = {}): Promise<TransactionExportRow[]> {
  const all = await listTickets(filters);
  const rows: TransactionExportRow[] = all.map((t) => ({
    'Ticket No': t.ticketNo,
    Date: dayjs(t.createdAt).format('DD-MM-YYYY'),
    Time: dayjs(t.createdAt).format('hh:mm A'),
    Counter: t.counterCode,
    'Issued By': t.issuedByName,
    Items: t.items.map((i) => `${i.name} x${i.qty}`).join(', '),
    Adults: t.adults,
    Children: t.children,
    Persons: t.totalPersons,
    'Taxable Value': t.taxableValue / 100,
    CGST: t.cgst / 100,
    SGST: t.sgst / 100,
    IGST: t.igst / 100,
    'Round Off': t.roundOff / 100,
    Total: t.totalAmount / 100,
    'Payment Mode': t.paymentMode,
    Status: t.status,
  }));
  return simulateLatency(rows);
}
