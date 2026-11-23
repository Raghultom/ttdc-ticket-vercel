import type { TicketCategory } from '../../types/models';
import { genId, readCollection, simulateLatency, writeCollection } from '../mock/storage';
import { record } from './auditLog';

export async function list(eventId?: string): Promise<TicketCategory[]> {
  const categories = readCollection<TicketCategory>('categories');
  const filtered = eventId ? categories.filter((c) => c.eventId === eventId) : categories;
  return simulateLatency([...filtered].sort((a, b) => a.sortOrder - b.sortOrder));
}

export async function create(data: Omit<TicketCategory, 'id'>): Promise<TicketCategory> {
  const categories = readCollection<TicketCategory>('categories');
  const category: TicketCategory = { ...data, id: genId('cat') };
  categories.push(category);
  writeCollection('categories', categories);
  return simulateLatency(category);
}

export async function update(
  id: string,
  data: Partial<Omit<TicketCategory, 'id'>>,
  actor: { id: string; name: string },
): Promise<TicketCategory> {
  const categories = readCollection<TicketCategory>('categories');
  const existing = categories.find((c) => c.id === id);
  if (!existing) throw new Error('Category not found');

  const priceChanged = data.price !== undefined && data.price !== existing.price;
  const updated: TicketCategory = { ...existing, ...data };
  writeCollection(
    'categories',
    categories.map((c) => (c.id === id ? updated : c)),
  );

  if (priceChanged) {
    await record('PRICE_CHANGE', actor.id, actor.name, {
      categoryId: id,
      categoryName: existing.name,
      oldPrice: existing.price,
      newPrice: data.price,
    });
  }

  return simulateLatency(updated);
}

export async function toggleActive(id: string, actor: { id: string; name: string }): Promise<TicketCategory> {
  const categories = readCollection<TicketCategory>('categories');
  const existing = categories.find((c) => c.id === id);
  if (!existing) throw new Error('Category not found');
  return update(id, { active: !existing.active }, actor);
}
