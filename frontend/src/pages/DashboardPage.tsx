import { useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import './DashboardPage.css';

const featureNames: Record<string, string> = {
  '/dashboard/overview': 'Tổng quan',
  '/dashboard/reports/revenue': 'Báo cáo Doanh thu',
  '/dashboard': 'Báo cáo Sản phẩm',
  '/dashboard/reports/products': 'Báo cáo Sản phẩm',
  '/dashboard/reports/staff': 'Báo cáo Nhân viên',
  '/dashboard/orders': 'Đơn hàng',
  '/dashboard/products/categories': 'Danh mục sản phẩm',
  '/dashboard/products/list': 'Danh sách sản phẩm',
  '/dashboard/inventory/manage': 'Quản lý tồn kho',
  '/dashboard/inventory/history': 'Lịch sử biến động',
  '/dashboard/staff': 'Quản lý Nhân viên',
  '/dashboard/tables': 'Quản lý Bàn',
  '/dashboard/promotions': 'Khuyến mãi',
  '/dashboard/settings': 'Thiết lập',
};

export default function DashboardPage() {
  const location = useLocation();
  const featureName = featureNames[location.pathname] || 'này';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '60px', backgroundColor: 'transparent' }}>
      <ShieldCheck size={64} strokeWidth={1.5} color="#e2e8f0" style={{ marginBottom: '24px' }} />
      <p style={{ color: '#8898aa', fontSize: '1.2rem', fontStyle: 'italic', margin: 0 }}>
        Tính năng {featureName} đang được phát triển và sẽ sớm ra mắt.
      </p>
    </div>
  );
}
