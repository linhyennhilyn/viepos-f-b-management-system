import { prisma } from '@/server/db/client';
import { hashPassword, verifyStoredPassword } from './password';
import type { RegisterStaffAccountRepository } from './register-user';

export const prismaAuthRepository: RegisterStaffAccountRepository = {
  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  },
  async createStaffAccount({ email, name, password, role, status }) {
    const passwordHash = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          name,
          emailVerified: false,
          password: passwordHash,
        },
      });

      await tx.account.create({
        data: {
          userId: createdUser.id,
          accountId: createdUser.id,
          providerId: 'credential',
          password: passwordHash,
        },
      });

      const appProfile = await tx.appUserProfile.create({
        data: {
          userId: createdUser.id,
          role,
          status,
        },
      });

      return {
        ...createdUser,
        appProfile,
      };
    });

    return {
      id: user.id,
      email: user.email,
      role: user.appProfile.role,
      status: user.appProfile.status,
    };
  },
};

export const findUserForLogin = async (email: string) =>
  prisma.user.findUnique({
    where: { email },
    include: {
      appProfile: true,
      accounts: {
        where: {
          providerId: 'credential',
        },
      },
    },
  });

export const isPasswordValidForUser = (
  password: string,
  passwordHash?: string | null
): Promise<boolean> => verifyStoredPassword(password, passwordHash);
