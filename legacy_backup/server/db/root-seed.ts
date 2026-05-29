import { ROOT_ADMIN_EMAIL, normalizeEmail } from '@/lib/auth/auth-roles';
import { hashPassword } from '@/server/auth/password';
import { prisma as defaultPrisma } from './client';

interface RootSeedEnv {
  ROOT_ADMIN_EMAIL?: string;
  ROOT_ADMIN_PASSWORD?: string;
  ROOT_ADMIN_NAME?: string;
  ROOT_ADMIN_RESET_PASSWORD?: string;
  ROOT_ADMIN_TRUST_EXISTING_PASSWORD?: string;
}

interface RootSeedPrisma {
  user: {
    findUnique?(input: unknown): Promise<{
      id: string;
      email: string;
      appProfile?: { role: string; status: string } | null;
    } | null>;
    upsert(input: unknown): Promise<{ id: string; email: string }>;
  };
  account?: {
    upsert(input: unknown): Promise<unknown>;
  };
  appUserProfile: {
    upsert(input: unknown): Promise<unknown>;
  };
}

export const seedRootAdmin = async ({
  prisma = defaultPrisma,
  env = process.env as RootSeedEnv,
}: {
  prisma?: RootSeedPrisma;
  env?: RootSeedEnv;
} = {}) => {
  const email = normalizeEmail(env.ROOT_ADMIN_EMAIL ?? ROOT_ADMIN_EMAIL);
  const password = env.ROOT_ADMIN_PASSWORD;

  if (email !== ROOT_ADMIN_EMAIL) {
    throw new Error(`ROOT_ADMIN_EMAIL must be ${ROOT_ADMIN_EMAIL}`);
  }

  if (!password || password.length < 8) {
    throw new Error('ROOT_ADMIN_PASSWORD must be set and at least 8 characters.');
  }

  const existingRoot = await prisma.user.findUnique?.({
    where: { email },
    include: { appProfile: true },
  });

  const resetPassword = env.ROOT_ADMIN_RESET_PASSWORD === 'true';
  const trustExistingPassword = env.ROOT_ADMIN_TRUST_EXISTING_PASSWORD === 'true';

  if (
    existingRoot &&
    !resetPassword &&
    !trustExistingPassword &&
    (existingRoot.appProfile?.role !== 'ROOT_ADMIN' || existingRoot.appProfile?.status !== 'ACTIVE')
  ) {
    throw new Error('Reserved root email already exists outside root seed control.');
  }

  const passwordHash = await hashPassword(password);
  const passwordUpdate = resetPassword ? { password: passwordHash } : {};

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      email,
      name: env.ROOT_ADMIN_NAME ?? 'ViePOS Root Admin',
      ...passwordUpdate,
    },
    create: {
      email,
      emailVerified: true,
      name: env.ROOT_ADMIN_NAME ?? 'ViePOS Root Admin',
      password: passwordHash,
    },
  });

  if (prisma.account) {
    await prisma.account.upsert({
      where: {
        providerId_accountId: {
          providerId: 'credential',
          accountId: user.id,
        },
      },
      update: passwordUpdate,
      create: {
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password: passwordHash,
      },
    });
  }

  await prisma.appUserProfile.upsert({
    where: { userId: user.id },
    update: { role: 'ROOT_ADMIN', status: 'ACTIVE' },
    create: { userId: user.id, role: 'ROOT_ADMIN', status: 'ACTIVE' },
  });

  return user;
};

if (process.env.RUN_ROOT_SEED === 'true') {
  seedRootAdmin()
    .then(() => defaultPrisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error);
      await defaultPrisma.$disconnect();
      process.exit(1);
    });
}
