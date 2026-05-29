export type UserRole = 'manager' | 'staff';

export interface DemoUser {
  email: string;
  displayName: string;
  role: UserRole;
  password?: string;
  pin?: string;
}

export interface LoginSession {
  email: string;
  displayName: string;
  role: UserRole;
  expiresAt: string;
  rememberedDevice: boolean;
}

export interface LoginResult {
  ok: boolean;
  message?: string;
  session?: LoginSession;
}
