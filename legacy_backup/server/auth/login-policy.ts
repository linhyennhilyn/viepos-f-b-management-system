import type { AppUserProfilePolicy, PolicyResult } from '@/lib/auth/auth-roles';

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export const AUTH_RATE_LIMITS = {
  login: { limit: 5, windowMs: 10 * 60 * 1000 },
  register: { limit: 3, windowMs: 60 * 60 * 1000 },
} satisfies Record<string, RateLimitConfig>;

export const canCreateSessionForUser = (
  user: Pick<AppUserProfilePolicy, 'role' | 'status'>
): PolicyResult => {
  if (user.status !== 'ACTIVE') {
    return { ok: false, message: 'Tài khoản chưa sẵn sàng để đăng nhập.' };
  }

  if (user.role !== 'ROOT_ADMIN' && user.role !== 'ADMIN' && user.role !== 'STAFF') {
    return { ok: false, message: 'Tài khoản chưa được phân quyền.' };
  }

  return { ok: true };
};

export const getPostLoginRedirect = (
  user?: Pick<AppUserProfilePolicy, 'role' | 'status'>
): string => {
  void user;
  return '/dashboard';
};

export const createFixedWindowRateLimiter = (config: RateLimitConfig) => {
  const entries = new Map<string, RateLimitEntry>();

  return {
    consume(key: string, now = Date.now()) {
      const existing = entries.get(key);
      const current =
        existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + config.windowMs };

      current.count += 1;
      entries.set(key, current);

      return {
        allowed: current.count <= config.limit,
        remaining: Math.max(config.limit - current.count, 0),
        resetAt: current.resetAt,
      };
    },
    reset(key: string) {
      entries.delete(key);
    },
  };
};

export const loginRateLimiter = createFixedWindowRateLimiter(AUTH_RATE_LIMITS.login);
export const registerRateLimiter = createFixedWindowRateLimiter(AUTH_RATE_LIMITS.register);
