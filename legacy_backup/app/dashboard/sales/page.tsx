import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DashboardModulePlaceholder } from '@/components/layout/dashboard-module-placeholder';
import { requireModuleAccess } from '@/lib/auth/require-session';

export default async function SalesPage() {
  const user = await requireModuleAccess('sales');

  return (
    <DashboardShell user={user}>
      <DashboardModulePlaceholder
        description="Khu vực bán hàng tại quầy sẽ kết nối menu, giỏ hàng và thanh toán trong các phase POS tiếp theo."
        eyebrow="POS"
        metrics={[
          { label: 'Menu bán hàng', value: 'Sắp triển khai' },
          { label: 'Giỏ hàng offline', value: 'Sắp triển khai' },
          { label: 'Thanh toán tiền mặt/VietQR', value: 'Sắp triển khai' },
        ]}
        title="Bán hàng tại quầy"
      />
    </DashboardShell>
  );
}
