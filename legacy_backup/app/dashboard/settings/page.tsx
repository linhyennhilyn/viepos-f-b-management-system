import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DashboardModulePlaceholder } from '@/components/layout/dashboard-module-placeholder';
import { requireModuleAccess } from '@/lib/auth/require-session';

export default async function SettingsPage() {
  const user = await requireModuleAccess('settings');

  return (
    <DashboardShell user={user}>
      <DashboardModulePlaceholder
        description="Cấu hình cửa hàng, phiên đăng nhập và thiết lập hệ thống sẽ được nối với quản trị vận hành ở phase sau."
        eyebrow="Hệ thống"
        metrics={[
          { label: 'Thông tin cửa hàng', value: 'Sắp triển khai' },
          { label: 'Thiết bị đăng nhập nhanh', value: 'Sắp triển khai' },
          { label: 'Cấu hình bảo mật', value: 'Sắp triển khai' },
        ]}
        title="Cài đặt"
      />
    </DashboardShell>
  );
}
