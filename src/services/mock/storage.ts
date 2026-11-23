const STORAGE_PREFIX = 'ttdc_ticketing_';

export function readCollection<T>(key: string): T[] {
  const raw = localStorage.getItem(STORAGE_PREFIX + key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export function writeCollection<T>(key: string, data: T[]): void {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
}

export function readValue<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(STORAGE_PREFIX + key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeValue<T>(key: string, value: T): void {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
}

export function hasAnyData(): boolean {
  return localStorage.getItem(STORAGE_PREFIX + 'seeded') === 'true';
}

export function markSeeded(): void {
  localStorage.setItem(STORAGE_PREFIX + 'seeded', 'true');
}

export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function simulateLatency<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
