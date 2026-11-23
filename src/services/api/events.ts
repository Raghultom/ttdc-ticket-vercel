import type { Event } from '../../types/models';
import { genId, readCollection, simulateLatency, writeCollection } from '../mock/storage';

export async function list(): Promise<Event[]> {
  const events = readCollection<Event>('events');
  return simulateLatency([...events].sort((a, b) => b.dateFrom.localeCompare(a.dateFrom)));
}

export async function getById(id: string): Promise<Event | null> {
  const events = readCollection<Event>('events');
  return simulateLatency(events.find((e) => e.id === id) ?? null, 0);
}

export async function create(data: Omit<Event, 'id' | 'createdAt'>): Promise<Event> {
  const events = readCollection<Event>('events');
  const event: Event = { ...data, id: genId('ev'), createdAt: new Date().toISOString() };
  events.push(event);
  writeCollection('events', events);
  return simulateLatency(event);
}

export async function update(id: string, data: Partial<Omit<Event, 'id' | 'createdAt'>>): Promise<Event> {
  const events = readCollection<Event>('events');
  const existing = events.find((e) => e.id === id);
  if (!existing) throw new Error('Event not found');
  const updated: Event = { ...existing, ...data };
  writeCollection(
    'events',
    events.map((e) => (e.id === id ? updated : e)),
  );
  return simulateLatency(updated);
}
