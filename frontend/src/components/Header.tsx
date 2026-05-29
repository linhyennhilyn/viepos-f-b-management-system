import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, HelpCircle, Heart, Bell, ChevronDown, LogOut,
         Home, BarChart2, ShoppingCart, Package, Users, Coffee, Tag, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearAuth } from '../utils/auth';
import { usePendingApprovals } from '../hooks/usePendingApprovals';
import { useSystemAlerts } from '../hooks/useSystemAlerts';
import NotifyDot from './NotifyDot';
import logoUrl from '../../assets/favicon/logoname.png';
import './Header.css';
import './NotifyDot.css';

export default function Header() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [notifPos, setNotifPos] = useState({ top: 0, left: 0 });
  const profileRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLButtonElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { counts: pendingCounts } = usePendingApprovals();
  const { alerts: systemAlerts } = useSystemAlerts();

  const totalNotifications = pendingCounts.total + systemAlerts.total;

  const staffName = localStorage.getItem('staffName') || 'Người dùng';
  const staffEmail = localStorage.getItem('staffEmail') || '';
  const role = localStorage.getItem('role') || 'MANAGER';
  const avatarLetter = staffName.trim().charAt(0).toUpperCase();
  const roleLabel = role === 'STAFF' ? 'Nhân viên' : 'Quản lý';

  // ---- Search ----
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  const NAV_ITEMS = [
    { label: 'Tổng quan',            path: '/dashboard',                          icon: <Home size={16} /> },
    { label: 'Báo cáo - Doanh thu',  path: '/dashboard/reports/revenue',          icon: <BarChart2 size={16} /> },
    { label: 'Báo cáo - Sản phẩm',  path: '/dashboard/reports/products',         icon: <BarChart2 size={16} /> },
    { label: 'Báo cáo - Nhân viên', path: '/dashboard/reports/staff',            icon: <BarChart2 size={16} /> },
    { label: 'Đơn hàng',            path: '/dashboard/orders',                   icon: <ShoppingCart size={16} /> },
    { label: 'Sản phẩm - Danh mục', path: '/dashboard/products/categories',      icon: <Package size={16} /> },
    { label: 'Sản phẩm - Danh sách',path: '/dashboard/products/list',            icon: <Package size={16} /> },
    { label: 'Kho hàng - Quản lý tồn kho',  path: '/dashboard/inventory/manage',    icon: <Package size={16} /> },
    { label: 'Kho hàng - Lịch sử biến động',path: '/dashboard/inventory/history',   icon: <Package size={16} /> },
    { label: 'Nhân viên - Danh sách',path: '/dashboard/staff/list',              icon: <Users size={16} /> },
    { label: 'Nhân viên - Yêu cầu phê duyệt',path: '/dashboard/staff/pending',  icon: <Users size={16} /> },
    { label: 'Nhân viên - Lịch sử phê duyệt',path: '/dashboard/staff/history',  icon: <Users size={16} /> },
    { label: 'Bàn',                 path: '/dashboard/tables',                   icon: <Coffee size={16} /> },
    { label: 'Khuyến mãi',          path: '/dashboard/promotions',               icon: <Tag size={16} /> },
    { label: 'Thiết lập',           path: '/dashboard/settings',                 icon: <Settings size={16} /> },
  ];

  const searchResults = query.trim()
    ? NAV_ITEMS.filter(item =>
        item.label.toLowerCase().includes(query.trim().toLowerCase())
      )
    : [];

  const handleSelectResult = (path: string) => {
    setQuery('');
    navigate(path);
  };

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate dropdown position based on the profile container's position
  const updateDropdownPos = () => {
    if (profileRef.current) {
      const rect = profileRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 16,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const handleToggle = () => {
    updateDropdownPos();
    setIsProfileOpen(prev => !prev);
    setIsNotifOpen(false);
  };

  const updateNotifPos = () => {
    if (notifRef.current) {
      const rect = notifRef.current.getBoundingClientRect();
      setNotifPos({
        top: rect.bottom + 20,
        left: rect.right - 280, // width of notif dropdown
      });
    }
  };

  const handleToggleNotif = () => {
    updateNotifPos();
    setIsNotifOpen(prev => !prev);
    setIsProfileOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        profileRef.current && 
        !profileRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        setIsProfileOpen(false);
      }
      if (
        notifRef.current && 
        !notifRef.current.contains(target) &&
        (!notifDropdownRef.current || !notifDropdownRef.current.contains(target))
      ) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotifClick = (tab: string) => {
    setIsNotifOpen(false);
    navigate('/dashboard/staff/pending', { state: { pendingSubTab: tab } });
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  return (
    <div className="header">
      <div className="header-left">
        <img src={logoUrl} alt="ViePOS Logo" className="header-logo-img" />
      </div>

      <div className="header-search" ref={searchRef}>
        <input
          type="text"
          placeholder="Tìm kiếm trang..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <Search size={18} className="search-icon" />
        {searchResults.length > 0 && (
          <div className="search-dropdown">
            {searchResults.map(item => (
              <div
                key={item.path}
                className="search-result-item"
                onMouseDown={() => handleSelectResult(item.path)}
              >
                <span className="search-result-icon">{item.icon}</span>
                <span className="search-result-label">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="header-right">
        <button className="header-icon-btn"><HelpCircle size={20} /></button>
        <button className="header-icon-btn"><Heart size={20} /></button>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="header-icon-btn has-notify"
            ref={notifRef}
            onClick={handleToggleNotif}
            title={
              totalNotifications > 0
                ? `${totalNotifications} thông báo mới`
                : 'Thông báo'
            }
          >
            <Bell size={20} />
            <NotifyDot show={totalNotifications > 0} />
          </button>
          
          {isNotifOpen && createPortal(
            <div
              ref={notifDropdownRef}
              className="profile-dropdown notif-dropdown"
              style={{
                position: 'fixed',
                top: notifPos.top,
                left: notifPos.left,
                width: 280,
                padding: '8px 0',
                maxHeight: '400px',
                overflowY: 'auto'
              }}
            >
              <div style={{ padding: '8px 16px', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '14px' }}>Thông báo</div>
              {totalNotifications === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                  Không có thông báo nào.
                </div>
              ) : (
                <>
                  {systemAlerts.outOfStock > 0 && (
                    <div className="dropdown-item" onClick={() => { setIsNotifOpen(false); navigate('/dashboard/inventory/manage'); }} style={{ padding: '12px 16px', alignItems: 'flex-start', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#dc2626', marginTop: 6, marginRight: 12, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '14px', color: '#333' }}>Có <b>{systemAlerts.outOfStock}</b> mặt hàng đã hết tồn kho!</div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: 4 }}>Bấm vào để kiểm tra kho</div>
                      </div>
                    </div>
                  )}
                  {systemAlerts.lowStock > 0 && (
                    <div className="dropdown-item" onClick={() => { setIsNotifOpen(false); navigate('/dashboard/inventory/manage'); }} style={{ padding: '12px 16px', alignItems: 'flex-start', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f97316', marginTop: 6, marginRight: 12, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '14px', color: '#333' }}>Có <b>{systemAlerts.lowStock}</b> mặt hàng sắp hết tồn kho.</div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: 4 }}>Bấm vào để kiểm tra kho</div>
                      </div>
                    </div>
                  )}
                  {systemAlerts.idleTables > 0 && (
                    <div className="dropdown-item" onClick={() => { setIsNotifOpen(false); navigate('/dashboard/tables'); }} style={{ padding: '12px 16px', alignItems: 'flex-start', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#8b5cf6', marginTop: 6, marginRight: 12, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '14px', color: '#333' }}>Có <b>{systemAlerts.idleTables}</b> bàn đang quá giờ hoặc sắp hết!</div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: 4 }}>Bấm vào để kiểm tra bàn</div>
                      </div>
                    </div>
                  )}
                  {pendingCounts.accounts > 0 && (
                    <div className="dropdown-item" onClick={() => handleNotifClick('accounts')} style={{ padding: '12px 16px', alignItems: 'flex-start', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444', marginTop: 6, marginRight: 12, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '14px', color: '#333' }}>Có <b>{pendingCounts.accounts}</b> yêu cầu tạo tài khoản mới.</div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: 4 }}>Bấm vào để duyệt ngay</div>
                      </div>
                    </div>
                  )}
                  {pendingCounts.pins > 0 && (
                    <div className="dropdown-item" onClick={() => handleNotifClick('pins')} style={{ padding: '12px 16px', alignItems: 'flex-start', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b', marginTop: 6, marginRight: 12, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '14px', color: '#333' }}>Có <b>{pendingCounts.pins}</b> yêu cầu đổi mã PIN.</div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: 4 }}>Bấm vào để xem chi tiết</div>
                      </div>
                    </div>
                  )}
                  {pendingCounts.resets > 0 && (
                    <div className="dropdown-item" onClick={() => handleNotifClick('resets')} style={{ padding: '12px 16px', alignItems: 'flex-start' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3b82f6', marginTop: 6, marginRight: 12, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '14px', color: '#333' }}>Có <b>{pendingCounts.resets}</b> yêu cầu cấp lại mật khẩu.</div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: 4 }}>Bấm vào để xem chi tiết</div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>,
            document.body
          )}
        </div>
        
        <div className="header-divider"></div>
        
        <div className="header-profile-container" ref={profileRef}>
          <div className="header-profile" onClick={handleToggle}>
            <div className="header-avatar">
              <span style={{ fontWeight: 600 }}>{avatarLetter}</span>
            </div>
            <div className="header-user-info">
              <span className="header-username" title={staffEmail}>{staffName}</span>
              <span className="header-role">{roleLabel}</span>
            </div>
            <ChevronDown size={16} color="#888" style={{ transform: isProfileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>

          {isProfileOpen && createPortal(
            <div
              ref={dropdownRef}
              className="profile-dropdown"
              style={{
                position: 'fixed',
                top: dropdownPos.top,
                left: dropdownPos.left,
                minWidth: dropdownPos.width || 160,
              }}
            >
              <div className="dropdown-item" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Đăng xuất</span>
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
}
