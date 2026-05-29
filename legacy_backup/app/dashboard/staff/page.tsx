import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DashboardModulePlaceholder } from '@/components/layout/dashboard-module-placeholder';
import { requireModuleAccess } from '@/lib/auth/require-session';

export default async function StaffPage() {
  const user = await requireModuleAccess('staff');

  return (
    <DashboardShell user={user}>
      <DashboardModulePlaceholder
        description="Theo dõi nhân viên, trạng thái tài khoản và liên kết nhanh tới các tác vụ duyệt/phân quyền."
        eyebrow="Nhân sự"
        metrics={[
          { label: 'Duyệt tài khoản mới', value: 'Admin' },
          { label: 'Phân quyền nhân viên', value: 'Root admin' },
          { label: 'Trạng thái tài khoản', value: 'Đang hoạt động' },
        ]}
        title="Nhân viên"
      />
    </DashboardShell>
  );
}
