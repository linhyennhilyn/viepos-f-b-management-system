import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { canAccessManagement, getAuthToken } from '../utils/auth';

/**
 * Chỉ ADMIN / ROOT_ADMIN được vào giao diện Quản lý (/dashboard).
 * Nhân viên (STAFF) không vào được dashboard — chuyển về trang đăng nhập Quản lý.
 */
export default function AdminRoute() {
  const location = useLocation();
  const token = getAuthToken();

  useEffect(() => {
    if (!token) {
      sessionStorage.setItem('authRedirectReason', 'management_login_required');
    } else if (!canAccessManagement()) {
      sessionStorage.setItem('authRedirectReason', 'staff_no_management');
    } else {
      sessionStorage.removeItem('authRedirectReason');
    }
  }, [token]);

  if (!token) {
    return <Navigate to="/login/manager" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessManagement()) {
    return <Navigate to="/login/manager" replace />;
  }

  return <Outlet />;
}
