import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DashboardModulePlaceholder } from '@/components/layout/dashboard-module-placeholder';
import { requireActiveUser } from '@/lib/auth/require-session';
import { getVisibleDashboardModules } from '@/lib/auth/permissions';

export default async function DashboardPage() {
  const user = await requireActiveUser();
  const modules = getVisibleDashboardModules(user);

  return (
    <DashboardShell user={user}>
      <DashboardModulePlaceholder
        description="Tổng quan nội bộ cho ca bán hàng. Các module hiển thị bên dưới được lọc theo quyền truy cập máy chủ."
        eyebrow="ViePOS Dashboard"
        metrics={[
          { label: 'Module khả dụng theo vai trò hiện tại', value: String(modules.length) },
          { label: 'Trạng thái tài khoản', value: user.status },
          { label: 'Vai trò đăng nhập', value: user.role },
        ]}
        title={`Xin chào, ${user.name}`}
      />
    </DashboardShell>
  );
}
