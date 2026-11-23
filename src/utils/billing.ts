// Pure billing/tax calculation functions. All money values are integers in paise.
// Used by both the Issue Ticket screen and the print layout so totals never diverge.

export interface BillingLineInput {
  categoryId: string;
  name: string;
  qty: number;
  unitPrice: number; // paise
}

export interface BillingLine extends BillingLineInput {
  amount: number; // paise
}

export interface TaxConfig {
  gstEnabled: boolean;
  gstRate: number; // percent, e.g. 18
  splitType: 'CGST_SGST' | 'IGST';
  pricingMode: 'INCLUSIVE' | 'EXCLUSIVE';
  roundOff: boolean;
}

export interface BillingResult {
  items: BillingLine[];
  grossTotal: number;
  taxableValue: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  finalTotal: number;
  totalPersons: number;
}

export function calculateBilling(lines: BillingLineInput[], tax: TaxConfig): BillingResult {
  const items: BillingLine[] = lines.map((l) => ({ ...l, amount: Math.round(l.qty * l.unitPrice) }));
  const grossLineSum = items.reduce((sum, l) => sum + l.amount, 0);
  const totalPersons = items.reduce((sum, l) => sum + l.qty, 0);

  let taxableValue: number;
  let gstAmount: number;
  let grossTotal: number;

  const gstActive = tax.gstEnabled && tax.gstRate > 0;

  if (!gstActive) {
    taxableValue = grossLineSum;
    gstAmount = 0;
    grossTotal = grossLineSum;
  } else if (tax.pricingMode === 'INCLUSIVE') {
    grossTotal = grossLineSum;
    taxableValue = Math.round(grossTotal / (1 + tax.gstRate / 100));
    gstAmount = grossTotal - taxableValue;
  } else {
    taxableValue = grossLineSum;
    gstAmount = Math.round(taxableValue * (tax.gstRate / 100));
    grossTotal = taxableValue + gstAmount;
  }

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (gstAmount > 0) {
    if (tax.splitType === 'CGST_SGST') {
      cgst = Math.round(gstAmount / 2);
      sgst = gstAmount - cgst;
    } else {
      igst = gstAmount;
    }
  }

  let roundOff = 0;
  let finalTotal = grossTotal;
  if (tax.roundOff) {
    const roundedRupees = Math.round(grossTotal / 100) * 100;
    roundOff = roundedRupees - grossTotal;
    finalTotal = roundedRupees;
  }

  return {
    items,
    grossTotal,
    taxableValue,
    gstAmount,
    cgst,
    sgst,
    igst,
    roundOff,
    finalTotal,
    totalPersons,
  };
}
