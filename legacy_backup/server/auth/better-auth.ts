import { prismaAdapter } from '@better-auth/prisma-adapter';
import { betterAuth } from 'better-auth';
import { prisma } from '@/server/db/client';

const isProductionBuild = process.env.npm_lifecycle_event === 'build';
const buildOnlySecret = 'vxRaB0U1w9PNoH6jKfYzdtm4IsQ2eXcuL7sVA8b3Mgw';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  secret: process.env.BETTER_AUTH_SECRET ?? (isProductionBuild ? buildOnlySecret : undefined),
  baseURL: process.env.BETTER_AUTH_URL ?? (isProductionBuild ? 'http://localhost:3000' : undefined),
});
