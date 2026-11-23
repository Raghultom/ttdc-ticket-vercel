import type { Event, EventStatus } from '../types/models';
import { todayISODate } from './format';

export function getEventStatus(event: Event, today: string = todayISODate()): EventStatus {
  if (today < event.dateFrom) return 'UPCOMING';
  if (today > event.dateTo) return 'OVER';
  return 'ONGOING';
}

export const EVENT_STATUS_LABEL_KEYS: Record<EventStatus, string> = {
  UPCOMING: 'events.upcoming',
  ONGOING: 'events.ongoing',
  OVER: 'events.over',
};

export const EVENT_STATUS_COLORS: Record<EventStatus, 'info' | 'success' | 'default'> = {
  UPCOMING: 'info',
  ONGOING: 'success',
  OVER: 'default',
};
