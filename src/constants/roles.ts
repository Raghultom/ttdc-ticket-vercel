export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUB_ADMIN: 'SUB_ADMIN',
  COUNTER_EMPLOYEE: 'COUNTER_EMPLOYEE',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
