export type AppRole = 'STAFF' | 'ADMIN' | 'ROOT_ADMIN' | string;

export function getAuthRole(): AppRole | null {
  return localStorage.getItem('role');
}

export function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

export function isAdminRole(role?: string | null): boolean {
  return role === 'ADMIN' || role === 'ROOT_ADMIN';
}

export function isStaffRole(role?: string | null): boolean {
  return role === 'STAFF';
}

export function canAccessManagement(role?: string | null): boolean {
  return isAdminRole(role ?? getAuthRole());
}

/** Trang mặc định sau khi Quản lý đăng nhập */
export const MANAGEMENT_HOME = '/dashboard/reports/revenue';

/** POS chỉ dành cho nhân viên đăng nhập bằng PIN */
export function canAccessPos(role?: string | null): boolean {
  const r = role ?? getAuthRole();
  return !!getAuthToken() && isStaffRole(r);
}

export function clearAuth(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('staffEmail');
  localStorage.removeItem('staffName');
  localStorage.removeItem('staffId');
  localStorage.removeItem('staffPhone');
  localStorage.removeItem('lastLoginTime');
}
