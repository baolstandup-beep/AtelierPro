import type { UserRole } from './types';

// Role ranking for pure hierarchy (Owner > Manager > Employee)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  OWNER: 100,
  MANAGER: 80,
  TAILOR: 40,
  CUTTER: 40,
  CASHIER: 40,
  EMPLOYEE: 20,
};

export function isOwner(role: UserRole): boolean {
  return role === 'OWNER';
}

export function isManagement(role: UserRole): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}

export function isFinancialRole(role: UserRole): boolean {
  return role === 'OWNER' || role === 'MANAGER' || role === 'CASHIER';
}

export function isProductionRole(role: UserRole): boolean {
  return role === 'OWNER' || role === 'MANAGER' || role === 'TAILOR' || role === 'CUTTER' || role === 'EMPLOYEE';
}

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  if (userRole === requiredRole) return true;
  if (userRole === 'OWNER') return true;
  if (userRole === 'MANAGER' && requiredRole !== 'OWNER') return true;
  return false;
}

export function hasAnyRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole) || (isManagement(userRole) && !requiredRoles.includes('OWNER'));
}

// Granular RBAC Permissions matching SQL function has_permission
export const PERMISSIONS = {
  // Customer management
  CREATE_CUSTOMER: (role: UserRole) => true, // Tous les membres de l'atelier
  EDIT_CUSTOMER: (role: UserRole) => true,
  DELETE_CUSTOMER: (role: UserRole) => isManagement(role),
  ARCHIVE_CUSTOMER: (role: UserRole) => isManagement(role),
  VIEW_CUSTOMER_DEBT: (role: UserRole) => isFinancialRole(role),

  // Orders management
  CREATE_ORDER: (role: UserRole) => true,
  EDIT_ORDER: (role: UserRole) => true,
  DELETE_ORDER: (role: UserRole) => isManagement(role),
  CANCEL_ORDER: (role: UserRole) => isManagement(role),
  CHANGE_ORDER_STATUS: (role: UserRole) => true,

  // Financial & Payments (Strictement OWNER, MANAGER, CASHIER)
  CREATE_PAYMENT: (role: UserRole) => isFinancialRole(role),
  VIEW_PAYMENTS: (role: UserRole) => isFinancialRole(role),
  DELETE_PAYMENT: (role: UserRole) => isOwner(role),
  VIEW_FINANCIAL_REPORTS: (role: UserRole) => isFinancialRole(role),

  // Measurements
  CREATE_MEASUREMENT: (role: UserRole) => true,
  VIEW_MEASUREMENTS: (role: UserRole) => true,

  // Team & RBAC management
  INVITE_MEMBER: (role: UserRole) => isManagement(role),
  MANAGE_MEMBERS: (role: UserRole) => isManagement(role),
  CHANGE_ROLES: (role: UserRole) => isOwner(role),
  REMOVE_MEMBER: (role: UserRole) => isOwner(role),

  // Workshop Settings & Audit
  EDIT_WORKSHOP: (role: UserRole) => isManagement(role),
  DELETE_WORKSHOP: (role: UserRole) => isOwner(role),
  VIEW_AUDIT_LOGS: (role: UserRole) => isManagement(role),

  // Expenses
  CREATE_EXPENSE: (role: UserRole) => isFinancialRole(role),
  VIEW_EXPENSES: (role: UserRole) => isFinancialRole(role),
  DELETE_EXPENSE: (role: UserRole) => isManagement(role),
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function checkPermission(role: UserRole, permission: PermissionKey): boolean {
  const checkFn = PERMISSIONS[permission];
  return checkFn ? checkFn(role) : false;
}
