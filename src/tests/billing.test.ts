import { describe, expect, it } from 'vitest';
import { calculateBilling, type TaxConfig } from '../utils/billing';

const baseLines = [
  { categoryId: 'cat1', name: 'Adult', qty: 2, unitPrice: 5000 },
  { categoryId: 'cat2', name: 'Child', qty: 3, unitPrice: 2500 },
];

describe('calculateBilling', () => {
  it('computes inclusive GST with CGST/SGST split and round off', () => {
    const tax: TaxConfig = {
      gstEnabled: true,
      gstRate: 18,
      splitType: 'CGST_SGST',
      pricingMode: 'INCLUSIVE',
      roundOff: true,
    };
    const result = calculateBilling(baseLines, tax);

    expect(result.grossTotal).toBe(17500);
    expect(result.taxableValue).toBe(14831);
    expect(result.gstAmount).toBe(2669);
    expect(result.cgst).toBe(1335);
    expect(result.sgst).toBe(1334);
    expect(result.finalTotal).toBe(17500);
    expect(result.roundOff).toBe(0);
    expect(result.totalPersons).toBe(5);
  });

  it('computes exclusive GST correctly', () => {
    const tax: TaxConfig = {
      gstEnabled: true,
      gstRate: 18,
      splitType: 'CGST_SGST',
      pricingMode: 'EXCLUSIVE',
      roundOff: false,
    };
    const result = calculateBilling(baseLines, tax);

    expect(result.taxableValue).toBe(17500);
    expect(result.gstAmount).toBe(3150);
    expect(result.cgst).toBe(1575);
    expect(result.sgst).toBe(1575);
    expect(result.grossTotal).toBe(20650);
    expect(result.finalTotal).toBe(20650);
  });

  it('handles zero GST (gst disabled)', () => {
    const tax: TaxConfig = {
      gstEnabled: false,
      gstRate: 18,
      splitType: 'CGST_SGST',
      pricingMode: 'INCLUSIVE',
      roundOff: false,
    };
    const result = calculateBilling(baseLines, tax);

    expect(result.taxableValue).toBe(17500);
    expect(result.gstAmount).toBe(0);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.grossTotal).toBe(17500);
    expect(result.finalTotal).toBe(17500);
  });

  it('handles a free category (unit price 0)', () => {
    const lines = [
      { categoryId: 'cat1', name: 'Adult', qty: 1, unitPrice: 5000 },
      { categoryId: 'cat3', name: 'Child Below 3', qty: 2, unitPrice: 0 },
    ];
    const tax: TaxConfig = {
      gstEnabled: true,
      gstRate: 18,
      splitType: 'CGST_SGST',
      pricingMode: 'INCLUSIVE',
      roundOff: false,
    };
    const result = calculateBilling(lines, tax);

    expect(result.items[1].amount).toBe(0);
    expect(result.grossTotal).toBe(5000);
    expect(result.totalPersons).toBe(3);
  });

  it('applies round off to nearest rupee and uses IGST when configured', () => {
    const lines = [{ categoryId: 'cat1', name: 'Adult', qty: 1, unitPrice: 5049 }];
    const tax: TaxConfig = {
      gstEnabled: true,
      gstRate: 18,
      splitType: 'IGST',
      pricingMode: 'EXCLUSIVE',
      roundOff: true,
    };
    const result = calculateBilling(lines, tax);

    expect(result.taxableValue).toBe(5049);
    expect(result.igst).toBe(909);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.grossTotal).toBe(5958);
    expect(result.roundOff).toBe(42);
    expect(result.finalTotal).toBe(6000);
  });
});
