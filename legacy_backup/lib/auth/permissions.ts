import type { AppRole, AppUserProfilePolicy, UserStatus } from './auth-roles';

export type DashboardModule =
  | 'sales'
  | 'orders'
  | 'menu'
  | 'staff'
  | 'staff-approvals'
  | 'staff-roles'
  | 'settings';

const MODULES_BY_ROLE: Record<AppRole, DashboardModule[]> = {
  ROOT_ADMIN: ['sales', 'orders', 'menu', 'staff', 'staff-approvals', 'staff-roles', 'settings'],
  ADMIN: ['sales', 'orders', 'menu', 'staff', 'staff-approvals', 'settings'],
  STAFF: ['sales', 'orders'],
};

export const canAccessDashboard = (user: Pick<AppUserProfilePolicy, 'role' | 'status'>): boolean =>
  user.status === 'ACTIVE' && user.role in MODULES_BY_ROLE;

export const getVisibleDashboardModules = (
  user: Pick<AppUserProfilePolicy, 'role' | 'status'>
): DashboardModule[] => {
  if (!canAccessDashboard(user)) {
    return [];
  }

  return MODULES_BY_ROLE[user.role];
};

export const canAccessModule = (
  user: Pick<AppUserProfilePolicy, 'role' | 'status'>,
  module: DashboardModule
): boolean => getVisibleDashboardModules(user).includes(module);

export const isKnownUserStatus = (status: string): status is UserStatus =>
  status === 'PENDING' || status === 'ACTIVE' || status === 'DISABLED';
