import { z } from 'zod';
import {
  ROOT_ADMIN_EMAIL,
  getInitialRoleForPublicSignup,
  getInitialStatusForPublicSignup,
  normalizeEmail,
  type AppRole,
  type UserStatus,
} from '@/lib/auth/auth-roles';

const registerInputSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1),
  password: z.string().min(8),
});

export interface RegisterStaffAccountInput {
  email: string;
  name: string;
  password: string;
}

export interface CreatedStaffAccount {
  id: string;
  email: string;
  role: AppRole;
  status: UserStatus;
}

export interface RegisterStaffAccountRepository {
  findByEmail(email: string): Promise<unknown | null>;
  createStaffAccount(input: {
    email: string;
    name: string;
    password: string;
    role: AppRole;
    status: UserStatus;
  }): Promise<CreatedStaffAccount>;
}

export interface RegisterStaffAccountResult {
  ok: boolean;
  message: string;
  account?: CreatedStaffAccount;
}

export const assertPublicEmailCanRegister = (email: string): RegisterStaffAccountResult => {
  if (normalizeEmail(email) === ROOT_ADMIN_EMAIL) {
    return { ok: false, message: 'Không thể tạo tài khoản với thông tin này.' };
  }

  return { ok: true, message: 'Email có thể đăng ký.' };
};

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 'P2002';

export const registerStaffAccount = async (
  input: RegisterStaffAccountInput,
  { repository }: { repository: RegisterStaffAccountRepository }
): Promise<RegisterStaffAccountResult> => {
  const parsed = registerInputSchema.safeParse({
    ...input,
    email: normalizeEmail(input.email),
    name: input.name.trim(),
  });

  if (!parsed.success) {
    return { ok: false, message: 'Thông tin đăng ký không hợp lệ.' };
  }

  const emailPolicy = assertPublicEmailCanRegister(parsed.data.email);

  if (!emailPolicy.ok) {
    return emailPolicy;
  }

  const existing = await repository.findByEmail(parsed.data.email);

  if (existing) {
    return { ok: false, message: 'Không thể tạo tài khoản với thông tin này.' };
  }

  let account: CreatedStaffAccount;

  try {
    account = await repository.createStaffAccount({
      ...parsed.data,
      role: getInitialRoleForPublicSignup(),
      status: getInitialStatusForPublicSignup(),
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, message: 'Không thể tạo tài khoản với thông tin này.' };
    }

    throw error;
  }

  return {
    ok: true,
    message: 'Tài khoản đã được tạo và đang chờ duyệt.',
    account,
  };
};
