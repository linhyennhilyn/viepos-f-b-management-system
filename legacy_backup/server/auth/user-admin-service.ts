import {
  assertCanApproveAccount,
  assertCanDisableAccount,
  assertCanUpdateRole,
} from '@/lib/auth/user-transitions';
import type { AppRole, AppUserProfilePolicy, PolicyResult, UserStatus } from '@/lib/auth/auth-roles';
import { prisma } from '@/server/db/client';

export type UserProfileRecord = AppUserProfilePolicy & { id: string };

export interface UserAdminRepository {
  findProfileByUserId(userId: string): Promise<UserProfileRecord | null>;
  updateProfile(
    userId: string,
    data: Partial<Pick<UserProfileRecord, 'role' | 'status'>>,
    expected?: Partial<Pick<UserProfileRecord, 'role' | 'status'>>
  ): Promise<boolean>;
}

export const prismaUserAdminRepository: UserAdminRepository = {
  async findProfileByUserId(userId) {
    const profile = await prisma.appUserProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!profile) {
      return null;
    }

    return {
      id: profile.userId,
      email: profile.user.email,
      role: profile.role,
      status: profile.status,
    };
  },
  async updateProfile(userId, data, expected) {
    const result = await prisma.appUserProfile.updateMany({
      where: {
        userId,
        ...(expected?.role ? { role: expected.role } : {}),
        ...(expected?.status ? { status: expected.status } : {}),
      },
      data,
    });

    return result.count === 1;
  },
};

const loadActorAndTarget = async (
  actorId: string,
  targetId: string,
  repository: UserAdminRepository
) => {
  const [actor, target] = await Promise.all([
    repository.findProfileByUserId(actorId),
    repository.findProfileByUserId(targetId),
  ]);

  if (!actor || !target) {
    return null;
  }

  return { actor, target };
};

export const approveStaffAccount = async (
  actorId: string,
  targetId: string,
  { repository = prismaUserAdminRepository }: { repository?: UserAdminRepository } = {}
): Promise<PolicyResult> => {
  const records = await loadActorAndTarget(actorId, targetId, repository);

  if (!records) {
    return { ok: false, message: 'Không tìm thấy tài khoản.' };
  }

  const policy = assertCanApproveAccount(records.actor, records.target);

  if (!policy.ok) {
    return policy;
  }

  const updated = await repository.updateProfile(
    targetId,
    { status: 'ACTIVE' satisfies UserStatus },
    { role: 'STAFF', status: 'PENDING' }
  );

  return updated ? { ok: true } : { ok: false, message: 'Trạng thái tài khoản đã thay đổi.' };
};

export const updateUserRole = async (
  actorId: string,
  targetId: string,
  role: AppRole,
  { repository = prismaUserAdminRepository }: { repository?: UserAdminRepository } = {}
): Promise<PolicyResult> => {
  const records = await loadActorAndTarget(actorId, targetId, repository);

  if (!records) {
    return { ok: false, message: 'Không tìm thấy tài khoản.' };
  }

  const policy = assertCanUpdateRole(records.actor, records.target, role);

  if (!policy.ok) {
    return policy;
  }

  const updated = await repository.updateProfile(targetId, { role }, {
    role: records.target.role,
    status: 'ACTIVE',
  });

  return updated ? { ok: true } : { ok: false, message: 'Trạng thái tài khoản đã thay đổi.' };
};

export const disableUserAccount = async (
  actorId: string,
  targetId: string,
  { repository = prismaUserAdminRepository }: { repository?: UserAdminRepository } = {}
): Promise<PolicyResult> => {
  const records = await loadActorAndTarget(actorId, targetId, repository);

  if (!records) {
    return { ok: false, message: 'Không tìm thấy tài khoản.' };
  }

  const policy = assertCanDisableAccount(records.actor, records.target);

  if (!policy.ok) {
    return policy;
  }

  const updated = await repository.updateProfile(targetId, { status: 'DISABLED' }, {
    role: records.target.role,
    status: records.target.status,
  });

  return updated ? { ok: true } : { ok: false, message: 'Trạng thái tài khoản đã thay đổi.' };
};
