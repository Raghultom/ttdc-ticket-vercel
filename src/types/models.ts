import type { Role } from '../constants/roles';
import type { PaymentMode } from '../constants/paymentModes';
import type { TicketStatus, AuditAction } from '../constants/ticketStatus';

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  counterIds: string[];
  mobile: string;
  email: string;
  active: boolean;
  createdBy: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Counter {
  id: string;
  eventId: string;
  code: string;
  name: string;
  location: string;
  allowedPaymentModes: PaymentMode[];
  ticketPrefix: string;
  active: boolean;
}

export type EventStatus = 'UPCOMING' | 'ONGOING' | 'OVER';

export interface Event {
  id: string;
  name: string;
  venue: string;
  city: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  timingsStart: string;
  timingsEnd: string;
  createdBy: string | null;
  createdAt: string;
}

export interface TicketCategory {
  id: string;
  eventId: string;
  code: string;
  name: string;
  price: number; // paise
  priceIncludesGst: boolean;
  ageRule: string;
  isFree: boolean;
  active: boolean;
  sortOrder: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export type GstSplitType = 'CGST_SGST' | 'IGST';
export type PricingMode = 'INCLUSIVE' | 'EXCLUSIVE';

export interface TaxSettings {
  gstEnabled: boolean;
  gstRate: number;
  splitType: GstSplitType;
  pricingMode: PricingMode;
  gstin: string;
  sacCode: string;
  roundOff: boolean;
}

export interface GeneralSettings {
  logoUrl: string;
  footerText: string;
  ticketValiditySameDayOnly: boolean;
  defaultPrinterSize: PrinterSize;
}

export type PrinterSize = '58mm' | '80mm' | 'A5' | 'A4';

export interface TicketItem {
  categoryId: string;
  name: string;
  qty: number;
  unitPrice: number; // paise
  amount: number; // paise
}

export interface TaxSnapshot {
  gstRate: number;
  pricingMode: PricingMode;
  splitType: GstSplitType;
}

export interface PaymentInfo {
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  cashReceived: number | null;
  changeReturned: number | null;
  upiManualRef: string | null;
}

export interface ReprintEntry {
  by: string;
  byName: string;
  at: string;
  reason: string;
}

export interface Ticket {
  id: string;
  ticketNo: string;
  eventId: string;
  counterId: string;
  counterCode: string;
  issuedBy: string;
  issuedByName: string;
  visitorName: string;
  visitorMobile: string;
  items: TicketItem[];
  totalPersons: number;
  adults: number;
  children: number;
  taxSnapshot: TaxSnapshot;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  totalAmount: number;
  paymentMode: PaymentMode;
  payment: PaymentInfo;
  status: TicketStatus;
  printCount: number;
  reprints: ReprintEntry[];
  cancelledBy: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export interface ShiftClose {
  id: string;
  userId: string;
  userName: string;
  counterId: string;
  counterCode: string;
  date: string;
  systemCash: number;
  systemUpi: number;
  declaredCash: number;
  difference: number;
  ticketCount: number;
  persons: number;
  closedAt: string;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  by: string;
  byName: string;
  at: string;
  details: Record<string, unknown>;
}

export interface TicketFilters {
  dateFrom?: string;
  dateTo?: string;
  eventId?: string;
  eventIds?: string[];
  counterId?: string;
  userId?: string;
  paymentMode?: PaymentMode;
  status?: TicketStatus;
  search?: string;
}
