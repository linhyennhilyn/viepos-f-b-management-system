import { revalidatePath } from 'next/cache';
import { prisma } from '@/server/db/client';
import { disableUserAccount, updateUserRole } from '@/server/auth/user-admin-service';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DashboardModulePlaceholder } from '@/components/layout/dashboard-module-placeholder';
import { requireActiveUser, requireModuleAccess } from '@/lib/auth/require-session';
import type { AppRole } from '@/lib/auth/auth-roles';

async function roleAction(formData: FormData) {
  'use server';

  const actor = await requireActiveUser();
  const targetId = String(formData.get('targetId') ?? '');
  const role = String(formData.get('role') ?? '') as AppRole;

  await updateUserRole(actor.id, targetId, role);
  revalidatePath('/dashboard/staff/roles');
}

async function disableAction(formData: FormData) {
  'use server';

  const actor = await requireActiveUser();
  const targetId = String(formData.get('targetId') ?? '');

  await disableUserAccount(actor.id, targetId);
  revalidatePath('/dashboard/staff/roles');
}

export default async function StaffRolesPage() {
  const user = await requireModuleAccess('staff-roles');
  const users = await prisma.appUserProfile.findMany({
    where: { status: 'ACTIVE', role: { in: ['ADMIN', 'STAFF'] } },
    include: { user: true },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <DashboardShell user={user}>
      <DashboardModulePlaceholder
        description="Root admin có thể nâng/hạ quyền giữa admin và staff hoặc khóa tài khoản đang hoạt động."
        eyebrow="Phân quyền"
        metrics={[{ label: 'Tài khoản có thể quản trị', value: String(users.length) }]}
        title="Vai trò nhân viên"
      />
      <div className="dashboard-grid">
        {users.length === 0 ? (
          <article>
            <strong>Không có tài khoản phù hợp</strong>
            <span>Danh sách chỉ hiển thị admin và staff đang hoạt động.</span>
          </article>
        ) : null}
        {users.map((profile) => (
          <article key={profile.id}>
            <strong>{profile.user.name}</strong>
            <span>
              {profile.user.email} - {profile.role}
            </span>
            <form action={roleAction} className="dashboard-action-form">
              <input name="targetId" type="hidden" value={profile.userId} />
              <input name="role" type="hidden" value={profile.role === 'ADMIN' ? 'STAFF' : 'ADMIN'} />
              <button type="submit">{profile.role === 'ADMIN' ? 'Hạ xuống staff' : 'Nâng lên admin'}</button>
            </form>
            <form action={disableAction} className="dashboard-action-form">
              <input name="targetId" type="hidden" value={profile.userId} />
              <button type="submit">Khóa tài khoản</button>
            </form>
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}
