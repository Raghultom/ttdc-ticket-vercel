import dayjs from 'dayjs';

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatCurrency(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paiseToRupees(paise));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

export function formatDate(iso: string | null | undefined, pattern = 'DD-MM-YYYY'): string {
  if (!iso) return '-';
  return dayjs(iso).format(pattern);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return dayjs(iso).format('DD-MM-YYYY hh:mm A');
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return dayjs(iso).format('hh:mm A');
}

export function todayISODate(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function maskMobile(mobile: string | null | undefined): string {
  if (!mobile) return '-';
  const digits = mobile.trim();
  if (digits.length < 10) return digits;
  return `${digits.slice(0, 2)}XXXXXX${digits.slice(-2)}`;
}
