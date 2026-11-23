import type { GeneralSettings, TaxSettings } from '../../types/models';
import { readValue, simulateLatency, writeValue } from '../mock/storage';
import { record } from './auditLog';

const DEFAULT_TAX: TaxSettings = {
  gstEnabled: true,
  gstRate: 18,
  splitType: 'CGST_SGST',
  pricingMode: 'INCLUSIVE',
  gstin: '',
  sacCode: '',
  roundOff: true,
};

const DEFAULT_GENERAL: GeneralSettings = {
  logoUrl: '',
  footerText: '',
  ticketValiditySameDayOnly: true,
  defaultPrinterSize: '80mm',
};

export async function getTax(): Promise<TaxSettings> {
  return simulateLatency(readValue('taxSettings', DEFAULT_TAX));
}

export async function updateTax(data: TaxSettings, actor: { id: string; name: string }): Promise<TaxSettings> {
  writeValue('taxSettings', data);
  await record('SETTINGS_CHANGE', actor.id, actor.name, { type: 'TAX', data });
  return simulateLatency(data);
}

export async function getGeneral(): Promise<GeneralSettings> {
  return simulateLatency(readValue('generalSettings', DEFAULT_GENERAL));
}

export async function updateGeneral(data: GeneralSettings, actor: { id: string; name: string }): Promise<GeneralSettings> {
  writeValue('generalSettings', data);
  await record('SETTINGS_CHANGE', actor.id, actor.name, { type: 'GENERAL', data });
  return simulateLatency(data);
}
