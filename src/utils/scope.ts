import { ROLES } from '../constants/roles';
import type { Event, User } from '../types/models';

export function visibleEvents(user: User, events: Event[]): Event[] {
  return user.role === ROLES.SUPER_ADMIN ? events : events.filter((e) => e.createdBy === user.id);
}

export function isOwnEvent(user: User, event: Event): boolean {
  return user.role === ROLES.SUPER_ADMIN || event.createdBy === user.id;
}

export function visibleCounterEmployees(user: User, users: User[]): User[] {
  const employees = users.filter((u) => u.role === ROLES.COUNTER_EMPLOYEE);
  return user.role === ROLES.SUPER_ADMIN ? employees : employees.filter((u) => u.createdBy === user.id);
}

export function basePathForRole(user: User): string {
  return user.role === ROLES.SUPER_ADMIN ? '/sa' : '/sub';
}

/**
 * For report filters: when no specific event is selected, "all events" must mean
 * "all of my events" for a Sub Admin, not literally every event in the system.
 * Returns undefined (no restriction) for Super Admin, or when a specific event is
 * already selected (that narrower filter already does the job).
 */
export function scopedEventIdsFilter(user: User, events: Event[], selectedEventId: string): string[] | undefined {
  if (selectedEventId || user.role === ROLES.SUPER_ADMIN) return undefined;
  return visibleEvents(user, events).map((e) => e.id);
}
