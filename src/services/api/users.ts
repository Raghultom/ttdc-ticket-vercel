import type { User } from '../../types/models';
import { genId, readCollection, simulateLatency, writeCollection } from '../mock/storage';

export async function list(): Promise<User[]> {
  return simulateLatency(readCollection<User>('users'));
}

export async function create(data: Omit<User, 'id' | 'createdAt' | 'lastLoginAt'>): Promise<User> {
  const users = readCollection<User>('users');
  if (users.some((u) => u.username.toLowerCase() === data.username.toLowerCase())) {
    throw new Error('Username already exists');
  }
  const user: User = { ...data, id: genId('u'), createdAt: new Date().toISOString(), lastLoginAt: null };
  users.push(user);
  writeCollection('users', users);
  return simulateLatency(user);
}

export async function update(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
  const users = readCollection<User>('users');
  const existing = users.find((u) => u.id === id);
  if (!existing) throw new Error('User not found');
  const updated: User = { ...existing, ...data };
  writeCollection(
    'users',
    users.map((u) => (u.id === id ? updated : u)),
  );
  return simulateLatency(updated);
}

export async function resetPassword(id: string, newPassword: string): Promise<User> {
  return update(id, { password: newPassword });
}

export async function assignCounter(id: string, counterId: string): Promise<User> {
  const users = readCollection<User>('users');
  const existing = users.find((u) => u.id === id);
  if (!existing) throw new Error('User not found');
  if (existing.counterIds.includes(counterId)) return simulateLatency(existing);
  return update(id, { counterIds: [...existing.counterIds, counterId] });
}

export async function unassignCounter(id: string, counterId: string): Promise<User> {
  const users = readCollection<User>('users');
  const existing = users.find((u) => u.id === id);
  if (!existing) throw new Error('User not found');
  return update(id, { counterIds: existing.counterIds.filter((c) => c !== counterId) });
}
