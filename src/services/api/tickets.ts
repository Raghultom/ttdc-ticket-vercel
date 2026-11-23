import dayjs from 'dayjs';
import type { Ticket, TicketFilters } from '../../types/models';
import { formatTicketNo, todayYmd } from '../../utils/ticketNumber';
import { genId, readCollection, readValue, simulateLatency, writeCollection, writeValue } from '../mock/storage';
import { record } from './auditLog';

type SequenceMap = Record<string, number>;

function sequenceKey(counterId: string, dateYmd: string): string {
  return `${counterId}_${dateYmd}`;
}

function peekNextSeq(counterId: string, dateYmd: string): number {
  const sequences = readValue<SequenceMap>('ticketSequences', {});
  return (sequences[sequenceKey(counterId, dateYmd)] ?? 0) + 1;
}

function consumeNextSeq(counterId: string, dateYmd: string): number {
  const sequences = readValue<SequenceMap>('ticketSequences', {});
  const key = sequenceKey(counterId, dateYmd);
  const next = (sequences[key] ?? 0) + 1;
  sequences[key] = next;
  writeValue('ticketSequences', sequences);
  return next;
}

export async function getNextTicketNo(counterId: string, counterCode: string, ticketPrefix: string): Promise<string> {
  const dateYmd = todayYmd();
  const seq = peekNextSeq(counterId, dateYmd);
  return simulateLatency(formatTicketNo(ticketPrefix, counterCode, dateYmd, seq), 0);
}

export type TicketDraft = Omit<Ticket, 'id' | 'ticketNo' | 'printCount' | 'reprints' | 'cancelledBy' | 'cancelReason' | 'createdAt'> & {
  ticketPrefix: string;
};

export async function create(draft: TicketDraft): Promise<Ticket> {
  const dateYmd = todayYmd();
  const seq = consumeNextSeq(draft.counterId, dateYmd);
  const ticketNo = formatTicketNo(draft.ticketPrefix, draft.counterCode, dateYmd, seq);

  const ticket: Ticket = {
    ...draft,
    id: genId('t'),
    ticketNo,
    printCount: draft.status === 'PAID' ? 1 : 0,
    reprints: [],
    cancelledBy: null,
    cancelReason: null,
    createdAt: new Date().toISOString(),
  };

  const tickets = readCollection<Ticket>('tickets');
  tickets.push(ticket);
  writeCollection('tickets', tickets);

  return simulateLatency(ticket);
}

export async function list(filters: TicketFilters = {}): Promise<Ticket[]> {
  let tickets = readCollection<Ticket>('tickets');

  if (filters.dateFrom) {
    tickets = tickets.filter((t) => dayjs(t.createdAt).format('YYYY-MM-DD') >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    tickets = tickets.filter((t) => dayjs(t.createdAt).format('YYYY-MM-DD') <= filters.dateTo!);
  }
  if (filters.eventId) {
    tickets = tickets.filter((t) => t.eventId === filters.eventId);
  }
  if (filters.eventIds) {
    tickets = tickets.filter((t) => filters.eventIds!.includes(t.eventId));
  }
  if (filters.counterId) {
    tickets = tickets.filter((t) => t.counterId === filters.counterId);
  }
  if (filters.userId) {
    tickets = tickets.filter((t) => t.issuedBy === filters.userId);
  }
  if (filters.paymentMode) {
    tickets = tickets.filter((t) => t.paymentMode === filters.paymentMode);
  }
  if (filters.status) {
    tickets = tickets.filter((t) => t.status === filters.status);
  }
  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    tickets = tickets.filter(
      (t) => t.ticketNo.toLowerCase().includes(q) || t.visitorMobile.includes(q) || t.visitorName.toLowerCase().includes(q),
    );
  }

  return simulateLatency([...tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function getById(id: string): Promise<Ticket | null> {
  const tickets = readCollection<Ticket>('tickets');
  return simulateLatency(tickets.find((t) => t.id === id) ?? null, 0);
}

export async function reprint(id: string, actor: { id: string; name: string }, reason: string): Promise<Ticket> {
  const tickets = readCollection<Ticket>('tickets');
  const existing = tickets.find((t) => t.id === id);
  if (!existing) throw new Error('Ticket not found');

  const updated: Ticket = {
    ...existing,
    printCount: existing.printCount + 1,
    reprints: [...existing.reprints, { by: actor.id, byName: actor.name, at: new Date().toISOString(), reason }],
  };
  writeCollection(
    'tickets',
    tickets.map((t) => (t.id === id ? updated : t)),
  );
  await record('REPRINT', actor.id, actor.name, { ticketId: id, ticketNo: existing.ticketNo, reason });

  return simulateLatency(updated);
}

export async function cancel(id: string, actor: { id: string; name: string }, reason: string): Promise<Ticket> {
  const tickets = readCollection<Ticket>('tickets');
  const existing = tickets.find((t) => t.id === id);
  if (!existing) throw new Error('Ticket not found');

  const updated: Ticket = { ...existing, status: 'CANCELLED', cancelledBy: actor.id, cancelReason: reason };
  writeCollection(
    'tickets',
    tickets.map((t) => (t.id === id ? updated : t)),
  );
  await record('CANCEL', actor.id, actor.name, { ticketId: id, ticketNo: existing.ticketNo, reason });

  return simulateLatency(updated);
}
