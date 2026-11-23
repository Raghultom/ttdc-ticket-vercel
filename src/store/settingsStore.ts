import { create } from 'zustand';
import type { Counter, Event, GeneralSettings, TaxSettings, TicketCategory } from '../types/models';
import * as categoriesApi from '../services/api/categories';
import * as countersApi from '../services/api/counters';
import * as eventsApi from '../services/api/events';
import * as settingsApi from '../services/api/settings';

interface SettingsState {
  categories: TicketCategory[];
  counters: Counter[];
  events: Event[];
  taxSettings: TaxSettings | null;
  generalSettings: GeneralSettings | null;
  loaded: boolean;
  loadAll: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshCounters: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshTaxSettings: () => Promise<void>;
  refreshGeneralSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  categories: [],
  counters: [],
  events: [],
  taxSettings: null,
  generalSettings: null,
  loaded: false,

  loadAll: async () => {
    const [categories, counters, events, taxSettings, generalSettings] = await Promise.all([
      categoriesApi.list(),
      countersApi.list(),
      eventsApi.list(),
      settingsApi.getTax(),
      settingsApi.getGeneral(),
    ]);
    set({ categories, counters, events, taxSettings, generalSettings, loaded: true });
  },

  refreshCategories: async () => {
    set({ categories: await categoriesApi.list() });
  },
  refreshCounters: async () => {
    set({ counters: await countersApi.list() });
  },
  refreshEvents: async () => {
    set({ events: await eventsApi.list() });
  },
  refreshTaxSettings: async () => {
    set({ taxSettings: await settingsApi.getTax() });
  },
  refreshGeneralSettings: async () => {
    set({ generalSettings: await settingsApi.getGeneral() });
  },
}));
