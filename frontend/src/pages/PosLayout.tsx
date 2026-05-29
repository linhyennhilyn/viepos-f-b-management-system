import { Outlet } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import './PosLayout.css';

export default function PosLayout() {
  return (
    <div className="pos-layout">
      <div className="pos-content">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
