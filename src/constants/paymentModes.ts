export const PAYMENT_MODES = {
  CASH: 'CASH',
  UPI: 'UPI',
  UPI_MANUAL: 'UPI_MANUAL',
} as const;

export type PaymentMode = (typeof PAYMENT_MODES)[keyof typeof PAYMENT_MODES];

export const PAYMENT_MODE_LABEL_KEYS: Record<PaymentMode, string> = {
  CASH: 'issueTicket.cash',
  UPI: 'issueTicket.upiRazorpay',
  UPI_MANUAL: 'issueTicket.upiManual',
};
