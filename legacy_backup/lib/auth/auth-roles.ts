export type AppRole = 'ROOT_ADMIN' | 'ADMIN' | 'STAFF';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED';

export interface AppUserProfilePolicy {
  email: string;
  role: AppRole;
  status: UserStatus;
}

export const ROOT_ADMIN_EMAIL = 'nguyennlt.ncc@gmail.com';

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const getInitialRoleForPublicSignup = (): AppRole => 'STAFF';

export const getInitialStatusForPublicSignup = (): UserStatus => 'PENDING';

export const isRootAdmin = (user: Pick<AppUserProfilePolicy, 'email' | 'role'>): boolean =>
  normalizeEmail(user.email) === ROOT_ADMIN_EMAIL && user.role === 'ROOT_ADMIN';

export interface PolicyResult {
  ok: boolean;
  message?: string;
}

export const allow = (): PolicyResult => ({ ok: true });

export const deny = (message = 'Không đủ quyền thực hiện thao tác này.'): PolicyResult => ({
  ok: false,
  message,
});
