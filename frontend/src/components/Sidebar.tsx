import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronDown, ChevronLeft } from 'lucide-react';
import iconHome      from '../../assets/icon/home.png';
import iconReport    from '../../assets/icon/report_white.png';
import iconOrder     from '../../assets/icon/order_white.png';
import iconWarehouse from '../../assets/icon/warehouse.png';
import iconProduct   from '../../assets/icon/product.png';
import iconStaff     from '../../assets/icon/staff.png';
import iconTable     from '../../assets/icon/table_white.png';
import iconVoucher   from '../../assets/icon/voucher_white.png';
import iconSetting   from '../../assets/icon/setting.png';
import { usePendingApprovals } from '../hooks/usePendingApprovals';
import NotifyDot from './NotifyDot';
import './Sidebar.css';
import './NotifyDot.css';

export default function Sidebar({ isSidebarOpen = true, toggleSidebar }: { isSidebarOpen?: boolean, toggleSidebar?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const isReportsActive = isActive('/dashboard/reports');
  const isProductsActive = isActive('/dashboard/products');
  const isInventoryActive = isActive('/dashboard/inventory');
  const isStaffActive = isActive('/dashboard/staff');
  const { counts: pendingCounts } = usePendingApprovals();

  const [reportsExpanded, setReportsExpanded] = useState(isReportsActive);
  const [productsExpanded, setProductsExpanded] = useState(isProductsActive);
  const [inventoryExpanded, setInventoryExpanded] = useState(isInventoryActive);
  const [staffExpanded, setStaffExpanded] = useState(isStaffActive);

  // Accordion: khi route thay đổi, chỉ xổ đúng tab cha, đóng những tab còn lại
  useEffect(() => {
    setReportsExpanded(isReportsActive);
    setProductsExpanded(isProductsActive);
    setInventoryExpanded(isInventoryActive);
    setStaffExpanded(isStaffActive);
  }, [location.pathname]);

  const navigateTo = (path: string, section?: 'reports' | 'products' | 'inventory' | 'staff') => {
    navigate(path);
    if (!isSidebarOpen && toggleSidebar) {
      // Don't auto-open sidebar when navigating from tooltip
    }
    if (section) {
      if (section !== 'reports') setReportsExpanded(false);
      if (section !== 'products') setProductsExpanded(false);
      if (section !== 'inventory') setInventoryExpanded(false);
      if (section !== 'staff') setStaffExpanded(false);
    } else {
      setReportsExpanded(false);
      setProductsExpanded(false);
      setInventoryExpanded(false);
      setStaffExpanded(false);
    }
  };

  const toggleMenu = (e: React.MouseEvent, setFunc: any, expanded: boolean) => {
    e.stopPropagation();
    if (isSidebarOpen) {
      setFunc(!expanded);
    }
  };

  return (
    <div className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
      {toggleSidebar && (
        <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      )}

      <div className="sidebar-nav">
        
        <div className="nav-group">
          <div className={`nav-item ${isActive('/dashboard', true) || isActive('/dashboard/overview') ? 'active' : ''}`} onClick={() => navigateTo('/dashboard')}>
            <div className="nav-item-left"><img src={iconHome} alt="Tổng quan" className="sidebar-nav-icon" /> <span className="nav-label">Tổng quan</span></div>
          </div>
        </div>

        <div className="nav-group">
          <div className={`nav-item ${isReportsActive ? 'active' : ''}`} onClick={(e) => toggleMenu(e, setReportsExpanded, reportsExpanded)}>
            <div className="nav-item-left"><img src={iconReport} alt="Báo cáo" className="sidebar-nav-icon" /> <span className="nav-label">Báo cáo</span></div>
            {(reportsExpanded && isSidebarOpen) ? <ChevronDown size={16} className="nav-chevron" /> : <ChevronRight size={16} className="nav-chevron" />}
          </div>
          
          {(reportsExpanded || !isSidebarOpen) && (
            <div className="nav-sub-menu">
              <div className="nav-sub-title">Báo cáo</div>
              <div className={`sub-nav-item ${isActive('/dashboard/reports/revenue') ? 'active' : ''}`} onClick={() => navigateTo('/dashboard/reports/revenue', 'reports')}>
                {isActive('/dashboard/reports/revenue') && <span className="sub-nav-indicator">●</span>}
                <span>Doanh thu</span>
              </div>
              <div className={`sub-nav-item ${isActive('/dashboard/reports/products') ? 'active' : ''}`} onClick={() => navigateTo('/dashboard/reports/products', 'reports')}>
                {isActive('/dashboard/reports/products') && <span className="sub-nav-indicator">●</span>}
                <span>Sản phẩm</span>
              </div>
              <div className={`sub-nav-item ${isActive('/dashboard/reports/staff') ? 'active' : ''}`} onClick={() => navigateTo('/dashboard/reports/staff', 'reports')}>
                {isActive('/dashboard/reports/staff') && <span className="sub-nav-indicator">●</span>}
                <span>Nhân viên</span>
              </div>
            </div>
          )}
        </div>

        <div className="nav-group">
          <div className={`nav-item ${isActive('/dashboard/orders') ? 'active' : ''}`} onClick={() => navigateTo('/dashboard/orders')}>
            <div className="nav-item-left"><img src={iconOrder} alt="Đơn hàng" className="sidebar-nav-icon" /> <span className="nav-label">Đơn hàng</span></div>
          </div>
        </div>

        <div className="nav-group">
          <div className={`nav-item ${isProductsActive ? 'active' : ''}`} onClick={(e) => toggleMenu(e, setProductsExpanded, productsExpanded)}>
            <div className="nav-item-left"><img src={iconProduct} alt="Sản phẩm" className="sidebar-nav-icon" /> <span className="nav-label">Sản phẩm</span></div>
            {(productsExpanded && isSidebarOpen) ? <ChevronDown size={16} className="nav-chevron" /> : <ChevronRight size={16} className="nav-chevron" />}
          </div>
          
          {(productsExpanded || !isSidebarOpen) && (
            <div className="nav-sub-menu">
              <div className="nav-sub-title">Sản phẩm</div>
              <div className={`sub-nav-item ${isActive('/dashboard/products/categories') ? 'active' : ''}`} onClick={() => navigateTo('/dashboard/products/categories', 'products')}>
                {isActive('/dashboard/products/categories') && <span className="sub-nav-indicator">●</span>}
                <span>Danh mục</span>
              </div>
              <div className={`sub-nav-item ${isActive('/dashboard/products/list') ? 'active' : ''}`} onClick={() => navigateTo('/dashboard/products/list', 'products')}>
                {isActive('/dashboard/products/list') && <span className="sub-nav-indicator">●</span>}
                <span>Danh sách sản phẩm</span>
              </div>
            </div>
          )}
        </div>

        <div className="nav-group">
          <div className={`nav-item ${isInventoryActive ? 'active' : ''}`} onClick={(e) => toggleMenu(e, setInventoryExpanded, inventoryExpanded)}>
            <div className="nav-item-left"><img src={iconWarehouse} alt="Kho hàng" className="sidebar-nav-icon" /> <span className="nav-label">Kho hàng</span></div>
            {(inventoryExpanded && isSidebarOpen) ? <ChevronDown size={16} className="nav-chevron" /> : <ChevronRight size={16} className="nav-chevron" />}
          </div>
          
          {(inventoryExpanded || !isSidebarOpen) && (
            <div className="nav-sub-menu">
              <div className="nav-sub-title">Kho hàng</div>
              <div className={`sub-nav-item ${isActive('/dashboard/inventory/manage') ? 'active' : ''}`} onClick={() => navigateTo('/dashboard/inventory/manage', 'inventory')}>
                {isActive('/dashboard/inventory/manage') && <span className="sub-nav-indicator">●</span>}
                <span>Quản lý tồn kho</span>
              </div>
              <div className={`sub-nav-item ${isActive('/dashboard/inventory/history') ? 'active' : ''}`} onClick={() => navigateTo('/dashboard/inventory/history', 'inventory')}>
                {isActive('/dashboard/inventory/history') && <span className="sub-nav-indicator">●</span>}
                <span>Lịch sử biến động</span>
              </div>
            </div>
          )}
        </div>

        <div className="nav-group">
          <div className={`nav-item has-notify ${isStaffActive ? 'active' : ''}`} onClick={(e) => toggleMenu(e, setStaffExpanded, staffExpanded)}>
            <div className="nav-item-left"><img src={iconStaff} alt="Nhân viên" className="sidebar-nav-icon" /> <span className="nav-label">Nhân viên</span></div>
            <NotifyDot show={pendingCounts.total > 0} title={`${pendingCounts.total} yêu cầu phê duyệt`} />
            {(staffExpanded && isSidebarOpen) ? <ChevronDown size={16} className="nav-chevron" /> : <ChevronRight size={16} className="nav-chevron" />}
          </div>
          
          {(staffExpanded || !isSidebarOpen) && (
            <div className="nav-sub-menu">
              <div className="nav-sub-title">Nhân viên</div>
              <div className={`sub-nav-item ${(isActive('/dashboard/staff/list') || isActive('/dashboard/staff', true)) ? 'active' : ''}`} onClick={() => navigateTo('/dashboard/staff/list', 'staff')}>
                {(isActive('/dashboard/staff/list') || isActive('/dashboard/staff', true)) && <span className="sub-nav-indicator">●</span>}
                <span>Danh sách nhân viên</span>
              </div>
              <div className={`sub-nav-item has-notify ${isActive('/dashboard/staff/pending') ? 'active' : ''}`} onClick={() => navigateTo('/dashboard/staff/pending', 'staff')}>
                {isActive('/dashboard/staff/pending') && <span className="sub-nav-indicator">●</span>}
                <span>Yêu cầu phê duyệt</span>
                <NotifyDot show={pendingCounts.total > 0} title={`${pendingCounts.total} yêu cầu phê duyệt`} />
              </div>
              <div className={`sub-nav-item ${isActive('/dashboard/staff/history') ? 'active' : ''}`} onClick={() => navigateTo('/dashboard/staff/history', 'staff')}>
                {isActive('/dashboard/staff/history') && <span className="sub-nav-indicator">●</span>}
                <span>Lịch sử phê duyệt</span>
              </div>
            </div>
          )}
        </div>

        <div className="nav-group">
          <div className={`nav-item ${isActive('/dashboard/tables') ? 'active' : ''}`} onClick={() => navigateTo('/dashboard/tables')}>
            <div className="nav-item-left"><img src={iconTable} alt="Bàn" className="sidebar-nav-icon" /> <span className="nav-label">Bàn</span></div>
          </div>
        </div>

        <div className="nav-group">
          <div className={`nav-item ${isActive('/dashboard/promotions') ? 'active' : ''}`} onClick={() => navigateTo('/dashboard/promotions')}>
            <div className="nav-item-left"><img src={iconVoucher} alt="Khuyến mãi" className="sidebar-nav-icon" /> <span className="nav-label">Khuyến mãi</span></div>
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="nav-group">
          <div className={`nav-item ${isActive('/dashboard/settings') ? 'active' : ''}`} onClick={() => navigateTo('/dashboard/settings')}>
            <div className="nav-item-left"><img src={iconSetting} alt="Thiết lập" className="sidebar-nav-icon" /> <span className="nav-label">Thiết lập</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
