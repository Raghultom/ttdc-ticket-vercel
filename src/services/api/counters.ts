import type { Counter } from '../../types/models';
import { genId, readCollection, simulateLatency, writeCollection } from '../mock/storage';

export async function list(eventId?: string): Promise<Counter[]> {
  const counters = readCollection<Counter>('counters');
  return simulateLatency(eventId ? counters.filter((c) => c.eventId === eventId) : counters);
}

export async function create(data: Omit<Counter, 'id'>): Promise<Counter> {
  const counters = readCollection<Counter>('counters');
  const counter: Counter = { ...data, id: genId('c') };
  counters.push(counter);
  writeCollection('counters', counters);
  return simulateLatency(counter);
}

export async function update(id: string, data: Partial<Omit<Counter, 'id'>>): Promise<Counter> {
  const counters = readCollection<Counter>('counters');
  const existing = counters.find((c) => c.id === id);
  if (!existing) throw new Error('Counter not found');
  const updated: Counter = { ...existing, ...data };
  writeCollection(
    'counters',
    counters.map((c) => (c.id === id ? updated : c)),
  );
  return simulateLatency(updated);
}
