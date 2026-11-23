export function formatTicketNo(
  prefix: string,
  counterCode: string,
  dateYmd: string, // YYYYMMDD
  seq: number,
): string {
  const seqStr = String(seq).padStart(4, '0');
  return `${prefix}-${counterCode}-${dateYmd}-${seqStr}`;
}

export function todayYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
