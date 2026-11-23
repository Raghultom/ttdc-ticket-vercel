import type { User } from '../../types/models';
import { readCollection, readValue, simulateLatency, writeCollection, writeValue } from '../mock/storage';
import { record } from './auditLog';

const SESSION_KEY = 'session';

export interface Session {
  userId: string;
  activeCounterId: string | null;
}

export async function login(username: string, password: string): Promise<User> {
  const users = readCollection<User>('users');
  const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());

  if (!user || user.password !== password) {
    throw new Error('auth.invalidCredentials');
  }
  if (!user.active) {
    throw new Error('auth.accountDeactivated');
  }

  user.lastLoginAt = new Date().toISOString();
  writeCollection(
    'users',
    users.map((u) => (u.id === user.id ? user : u)),
  );
  writeValue<Session | null>(SESSION_KEY, {
    userId: user.id,
    activeCounterId: user.counterIds.length === 1 ? user.counterIds[0] : null,
  });
  await record('LOGIN', user.id, user.name, { username: user.username });

  return simulateLatency(user);
}

export async function logout(): Promise<void> {
  writeValue<Session | null>(SESSION_KEY, null);
  return simulateLatency(undefined, 50);
}

export async function getCurrentUser(): Promise<User | null> {
  const session = readValue<Session | null>(SESSION_KEY, null);
  if (!session) return simulateLatency(null, 0);
  const users = readCollection<User>('users');
  const user = users.find((u) => u.id === session.userId) ?? null;
  return simulateLatency(user, 0);
}

export function getActiveCounterId(): string | null {
  const session = readValue<Session | null>(SESSION_KEY, null);
  return session?.activeCounterId ?? null;
}

export function setActiveCounterId(counterId: string | null): void {
  const session = readValue<Session | null>(SESSION_KEY, null);
  if (!session) return;
  writeValue<Session | null>(SESSION_KEY, { ...session, activeCounterId: counterId });
}
