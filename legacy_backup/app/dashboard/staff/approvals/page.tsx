import { revalidatePath } from 'next/cache';
import { prisma } from '@/server/db/client';
import { approveStaffAccount } from '@/server/auth/user-admin-service';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DashboardModulePlaceholder } from '@/components/layout/dashboard-module-placeholder';
import { requireActiveUser, requireModuleAccess } from '@/lib/auth/require-session';

async function approveAction(formData: FormData) {
  'use server';

  const actor = await requireActiveUser();
  const targetId = String(formData.get('targetId') ?? '');

  await approveStaffAccount(actor.id, targetId);
  revalidatePath('/dashboard/staff/approvals');
}

export default async function StaffApprovalsPage() {
  const user = await requireModuleAccess('staff-approvals');
  const pendingStaff = await prisma.appUserProfile.findMany({
    where: { role: 'STAFF', status: 'PENDING' },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <DashboardShell user={user}>
      <DashboardModulePlaceholder
        description="Duyệt tài khoản nhân viên đang chờ kích hoạt. Tác vụ duyệt vẫn chạy bằng server action hiện có."
        eyebrow="Nhân sự"
        metrics={[{ label: 'Tài khoản đang chờ duyệt', value: String(pendingStaff.length) }]}
        title="Duyệt tài khoản"
      />
      <div className="dashboard-grid">
        {pendingStaff.length === 0 ? (
          <article>
            <strong>Không có tài khoản chờ duyệt</strong>
            <span>Danh sách sẽ hiển thị khi nhân viên mới đăng ký.</span>
          </article>
        ) : null}
        {pendingStaff.map((profile) => (
          <article key={profile.id}>
            <strong>{profile.user.name}</strong>
            <span>{profile.user.email}</span>
            <form action={approveAction} className="dashboard-action-form">
              <input name="targetId" type="hidden" value={profile.userId} />
              <button type="submit">Duyệt</button>
            </form>
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}
