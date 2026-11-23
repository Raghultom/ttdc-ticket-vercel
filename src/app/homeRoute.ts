import type { Role } from '../constants/roles';

export function homeRouteForRole(role: Role): string {
  if (role === 'SUPER_ADMIN') return '/sa/dashboard';
  if (role === 'SUB_ADMIN') return '/sub/dashboard';
  return '/counter/issue';
}
