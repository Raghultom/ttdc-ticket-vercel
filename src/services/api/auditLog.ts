import type { AuditAction } from '../../constants/ticketStatus';
import type { AuditLog } from '../../types/models';
import { genId, readCollection, simulateLatency, writeCollection } from '../mock/storage';

export async function list(): Promise<AuditLog[]> {
  const logs = readCollection<AuditLog>('auditLogs');
  return simulateLatency([...logs].sort((a, b) => b.at.localeCompare(a.at)));
}

export async function record(
  action: AuditAction,
  by: string,
  byName: string,
  details: Record<string, unknown> = {},
): Promise<AuditLog> {
  const logs = readCollection<AuditLog>('auditLogs');
  const entry: AuditLog = {
    id: genId('al'),
    action,
    by,
    byName,
    at: new Date().toISOString(),
    details,
  };
  logs.push(entry);
  writeCollection('auditLogs', logs);
  return simulateLatency(entry, 0);
}
