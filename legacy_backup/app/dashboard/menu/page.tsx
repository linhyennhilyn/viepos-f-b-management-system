import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DashboardModulePlaceholder } from '@/components/layout/dashboard-module-placeholder';
import { requireModuleAccess } from '@/lib/auth/require-session';

export default async function MenuPage() {
  const user = await requireModuleAccess('menu');

  return (
    <DashboardShell user={user}>
      <DashboardModulePlaceholder
        description="Quản lý danh mục món, giá bán và trạng thái hiển thị. Màn hình này hiện là placeholder giao diện."
        eyebrow="Danh mục"
        metrics={[
          { label: 'Danh mục món', value: 'Sắp triển khai' },
          { label: 'Giá bán', value: 'Sắp triển khai' },
          { label: 'Trạng thái hiển thị', value: 'Sắp triển khai' },
        ]}
        title="Menu"
      />
    </DashboardShell>
  );
}
