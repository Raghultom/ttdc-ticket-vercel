import { create } from 'zustand';
import type { PrinterSize } from '../types/models';
import { readValue, writeValue } from '../services/mock/storage';

const KEY = 'printerPaperSize';

interface PrinterSettingsState {
  paperSize: PrinterSize;
  setPaperSize: (size: PrinterSize) => void;
}

export const usePrinterSettingsStore = create<PrinterSettingsState>((set) => ({
  paperSize: readValue<PrinterSize | null>(KEY, null) ?? '80mm',
  setPaperSize: (size) => {
    writeValue(KEY, size);
    set({ paperSize: size });
  },
}));
