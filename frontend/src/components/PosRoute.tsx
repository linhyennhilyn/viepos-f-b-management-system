import { Navigate, Outlet } from 'react-router-dom';
import { canAccessPos } from '../utils/auth';

/** POS: chỉ nhân viên (STAFF) đăng nhập bằng PIN. */
export default function PosRoute() {
  if (!canAccessPos()) {
    return <Navigate to="/login/staff" replace />;
  }
  return <Outlet />;
}
