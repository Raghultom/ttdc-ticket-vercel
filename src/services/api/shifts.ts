import type { ShiftClose } from '../../types/models';
import { todayISODate } from '../../utils/format';
import { genId, readCollection, simulateLatency, writeCollection } from '../mock/storage';
import { list as listTickets } from './tickets';

export interface ShiftTotals {
  systemCash: number;
  systemUpi: number;
  ticketCount: number;
  persons: number;
}

export async function getShiftTotals(userId: string, counterId: string, date: string = todayISODate()): Promise<ShiftTotals> {
  const tickets = (
    await listTickets({ userId, counterId, dateFrom: date, dateTo: date, status: 'PAID' })
  );

  const totals: ShiftTotals = {
    systemCash: tickets.filter((t) => t.paymentMode === 'CASH').reduce((s, t) => s + t.totalAmount, 0),
    systemUpi: tickets.filter((t) => t.paymentMode !== 'CASH').reduce((s, t) => s + t.totalAmount, 0),
    ticketCount: tickets.length,
    persons: tickets.reduce((s, t) => s + t.totalPersons, 0),
  };

  return simulateLatency(totals, 0);
}

export interface ShiftCloseInput {
  userId: string;
  userName: string;
  counterId: string;
  counterCode: string;
  declaredCash: number;
}

export async function closeShift(input: ShiftCloseInput): Promise<ShiftClose> {
  const date = todayISODate();
  const totals = await getShiftTotals(input.userId, input.counterId, date);

  const shift: ShiftClose = {
    id: genId('s'),
    userId: input.userId,
    userName: input.userName,
    counterId: input.counterId,
    counterCode: input.counterCode,
    date,
    systemCash: totals.systemCash,
    systemUpi: totals.systemUpi,
    declaredCash: input.declaredCash,
    difference: input.declaredCash - totals.systemCash,
    ticketCount: totals.ticketCount,
    persons: totals.persons,
    closedAt: new Date().toISOString(),
  };

  const shifts = readCollection<ShiftClose>('shifts');
  shifts.push(shift);
  writeCollection('shifts', shifts);

  return simulateLatency(shift);
}

export async function list(filters: { counterId?: string; dateFrom?: string; dateTo?: string } = {}): Promise<ShiftClose[]> {
  let shifts = readCollection<ShiftClose>('shifts');
  if (filters.counterId) shifts = shifts.filter((s) => s.counterId === filters.counterId);
  if (filters.dateFrom) shifts = shifts.filter((s) => s.date >= filters.dateFrom!);
  if (filters.dateTo) shifts = shifts.filter((s) => s.date <= filters.dateTo!);
  return simulateLatency([...shifts].sort((a, b) => b.closedAt.localeCompare(a.closedAt)));
}
