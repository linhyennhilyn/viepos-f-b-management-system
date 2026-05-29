import type { DemoUser, LoginResult, UserRole } from './types';

const SESSION_HOURS_BY_ROLE: Record<UserRole, number> = {
  manager: 8,
  staff: 4,
};

const REMEMBER_DEVICE_DAYS = 7;

export const DEMO_USERS: DemoUser[] = [
  {
    email: 'manager@test.com',
    displayName: 'Quản lý ViePOS',
    role: 'manager',
    password: 'password123',
  },
  {
    email: 'staff@test.com',
    displayName: 'Thu ngân ViePOS',
    role: 'staff',
    pin: '123456',
  },
];

interface ValidateLoginInput {
  email: string;
  secret: string;
  role: UserRole;
  rememberDevice: boolean;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const createExpiry = (role: UserRole, rememberDevice: boolean): string => {
  const expiresAt = new Date();
  const hours = SESSION_HOURS_BY_ROLE[role];

  if (rememberDevice) {
    expiresAt.setDate(expiresAt.getDate() + REMEMBER_DEVICE_DAYS);
  } else {
    expiresAt.setHours(expiresAt.getHours() + hours);
  }

  return expiresAt.toISOString();
};

export const validateLogin = ({
  email,
  secret,
  role,
  rememberDevice,
}: ValidateLoginInput): LoginResult => {
  const user = DEMO_USERS.find(
    (candidate) => candidate.email === normalizeEmail(email) && candidate.role === role
  );

  if (!user) {
    return { ok: false, message: 'Không tìm thấy tài khoản phù hợp.' };
  }

  const expectedSecret = role === 'manager' ? user.password : user.pin;

  if (!expectedSecret || secret !== expectedSecret) {
    return {
      ok: false,
      message: role === 'manager' ? 'Mật khẩu không đúng.' : 'PIN không đúng.',
    };
  }

  return {
    ok: true,
    session: {
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      expiresAt: createExpiry(user.role, rememberDevice),
      rememberedDevice: rememberDevice,
    },
  };
};
