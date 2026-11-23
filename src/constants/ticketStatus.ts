export const TICKET_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const TICKET_STATUS_LABEL_KEYS: Record<TicketStatus, string> = {
  PENDING: 'reports.pending',
  PAID: 'reports.paid',
  FAILED: 'reports.failed',
  CANCELLED: 'reports.cancelled',
};

export const AUDIT_ACTIONS = {
  PRICE_CHANGE: 'PRICE_CHANGE',
  REPRINT: 'REPRINT',
  CANCEL: 'CANCEL',
  LOGIN: 'LOGIN',
  SETTINGS_CHANGE: 'SETTINGS_CHANGE',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
