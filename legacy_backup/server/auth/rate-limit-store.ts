import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/client';
import type { RateLimitConfig } from './login-policy';

export interface ConsumedRateLimit {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export const consumeStoredRateLimit = async (
  key: string,
  now: Date,
  config: RateLimitConfig
): Promise<ConsumedRateLimit> => {
  const resetAt = new Date(now.getTime() + config.windowMs);
  const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>(
    Prisma.sql`
      INSERT INTO "AuthRateLimit" ("key", "count", "resetAt", "createdAt", "updatedAt")
      VALUES (${key}, 1, ${resetAt}, ${now}, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "AuthRateLimit"."resetAt" <= ${now} THEN 1
          ELSE "AuthRateLimit"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "AuthRateLimit"."resetAt" <= ${now} THEN ${resetAt}
          ELSE "AuthRateLimit"."resetAt"
        END,
        "updatedAt" = ${now}
      RETURNING "count", "resetAt"
    `
  );
  const updated = rows[0];

  return {
    allowed: updated.count <= config.limit,
    remaining: Math.max(config.limit - updated.count, 0),
    resetAt: updated.resetAt,
  };
};

export const resetStoredRateLimit = async (key: string): Promise<void> => {
  await prisma.authRateLimit.delete({ where: { key } }).catch(() => undefined);
};
