import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DashboardModulePlaceholder } from '@/components/layout/dashboard-module-placeholder';
import { requireModuleAccess } from '@/lib/auth/require-session';

export default async function OrdersPage() {
  const user = await requireModuleAccess('orders');

  return (
    <DashboardShell user={user}>
      <DashboardModulePlaceholder
        description="Theo dõi đơn hàng, trạng thái thanh toán và lịch sử thao tác tại quầy khi workflow đơn hàng được nối dữ liệu."
        eyebrow="Vận hành"
        metrics={[
          { label: 'Danh sách đơn', value: 'Chưa nối dữ liệu' },
          { label: 'Trạng thái thanh toán', value: 'Chưa nối dữ liệu' },
          { label: 'Lọc theo ca bán', value: 'Chưa nối dữ liệu' },
        ]}
        title="Đơn hàng"
      />
    </DashboardShell>
  );
}
