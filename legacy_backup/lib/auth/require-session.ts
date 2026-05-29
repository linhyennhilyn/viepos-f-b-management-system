import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { canAccessDashboard, canAccessModule, type DashboardModule } from './permissions';
import { auth } from '@/server/auth/better-auth';
import { prisma } from '@/server/db/client';

export const getCurrentUserProfile = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  const profile = await prisma.appUserProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: true },
  });

  if (!profile) {
    return null;
  }

  return {
    id: profile.userId,
    email: profile.user.email,
    name: profile.user.name,
    role: profile.role,
    status: profile.status,
  };
};

export const requireActiveUser = async () => {
  const user = await getCurrentUserProfile();

  if (!user || !canAccessDashboard(user)) {
    redirect('/login');
  }

  return user;
};

export const requireModuleAccess = async (module: DashboardModule) => {
  const user = await requireActiveUser();

  if (!canAccessModule(user, module)) {
    redirect('/dashboard');
  }

  return user;
};
