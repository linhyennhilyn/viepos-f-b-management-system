import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './pages/AuthLayout';
import RoleSelectionPage from './pages/RoleSelectionPage';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './pages/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import StaffLoginPage from './pages/StaffLoginPage';
import StaffRegisterPage from './pages/StaffRegisterPage';
import StaffManagementPage from './pages/StaffManagementPage';
import PosLayout from './pages/PosLayout';
import PosHomePage from './pages/PosHomePage';
import PosTablesPage from './pages/PosTablesPage';
import PosSalesPage from './pages/PosSalesPage';
import PosOrdersPage from './pages/PosOrdersPage';
import PosAccountPage from './pages/PosAccountPage';
import PosChangePinPage from './pages/PosChangePinPage';
import RevenueReportPage from './pages/RevenueReportPage';
import InventoryManagementPage from './pages/InventoryManagementPage';
import InventoryHistoryPage from './pages/InventoryHistoryPage';
import ProductListPage from './pages/ProductListPage';
import CategoryListPage from './pages/CategoryListPage';
import OrderManagementPage from './pages/OrderManagementPage';
import TableManagementPage from './pages/TableManagementPage';
import SettingsPage from './pages/SettingsPage';
import AdminRegisterPage from './pages/AdminRegisterPage';
import AdminRoute from './components/AdminRoute';
import PosRoute from './components/PosRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/" element={<RoleSelectionPage />} />
          <Route path="/login/manager" element={<LoginPage />} />
          <Route path="/register/manager" element={<AdminRegisterPage />} />
        </Route>
        
        {/* Mobile-first staff pages */}
        <Route path="/login/staff" element={<StaffLoginPage />} />
        <Route path="/register/staff" element={<StaffRegisterPage />} />
        
        {/* Staff POS Layout — STAFF + ADMIN (đăng nhập POS) */}
        <Route path="/pos" element={<PosRoute />}>
          <Route element={<PosLayout />}>
          <Route index element={<Navigate to="sales" replace />} />
          <Route path="home" element={<PosHomePage />} />
          <Route path="tables" element={<PosTablesPage />} />
          <Route path="sales" element={<PosSalesPage />} />
          <Route path="orders" element={<PosOrdersPage />} />
          <Route path="account" element={<PosAccountPage />} />
          <Route path="change-pin" element={<PosChangePinPage />} />
          </Route>
        </Route>

        {/* Quản lý — chỉ ADMIN / ROOT_ADMIN */}
        <Route path="/dashboard" element={<AdminRoute />}>
          <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="reports/revenue" replace />} />
          <Route path="reports/revenue" element={<RevenueReportPage />} />
          <Route path="staff" element={<StaffManagementPage />} />
          <Route path="staff/list" element={<StaffManagementPage />} />
          <Route path="staff/pending" element={<StaffManagementPage />} />
          <Route path="staff/history" element={<StaffManagementPage />} />
          <Route path="products/categories" element={<CategoryListPage />} />
          <Route path="products/list" element={<ProductListPage />} />
          <Route path="inventory/manage" element={<InventoryManagementPage />} />
          <Route path="inventory/history" element={<InventoryHistoryPage />} />
          <Route path="orders" element={<OrderManagementPage />} />
          <Route path="tables" element={<TableManagementPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<DashboardPage />} />
          </Route>
        </Route>
        
        {/* Mặc định chuyển tới trang chủ chọn role */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
