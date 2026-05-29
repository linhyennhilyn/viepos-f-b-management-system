import React, { useState } from 'react';
import { Trash2, Download, AlertTriangle, Calendar, Shield, Check, Edit2, X, Lock } from 'lucide-react';
import api from '../services/api';
import CustomSelect from '../components/CustomSelect';
import './SettingsPage.css';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'data' | 'roles'>('data');

  const initialStaffPermissions = {
    pos_view: true,
    pos_order: true,
    pos_card: true,
    pos_cancel: false,
    prod_view: true,
    prod_edit: false,
    table_edit: false,
    inv_view: true,
    inv_edit: false,
    staff_view: false,
    staff_approve: false,
    staff_edit: false,
    report_view: false,
    sys_export: false,
    sys_delete: false,
  };

  const [isEditingRoles, setIsEditingRoles] = useState(false);
  const [staffPermissions, setStaffPermissions] = useState(initialStaffPermissions);
  const [savedPermissions, setSavedPermissions] = useState(initialStaffPermissions);
  
  const hasRoleChanges = JSON.stringify(staffPermissions) !== JSON.stringify(savedPermissions);

  const handleSaveRoles = () => {
    setSavedPermissions(staffPermissions);
    setIsEditingRoles(false);
    alert('Đã lưu cấu hình phân quyền thành công!');
  };
  
  const handleCancelRoles = () => {
    setStaffPermissions(savedPermissions);
    setIsEditingRoles(false);
  };

  const togglePermission = (key: keyof typeof initialStaffPermissions) => {
    if (!isEditingRoles) return;
    setStaffPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // States for Data Tab
  const [module, setModule] = useState('orders');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dataRange, setDataRange] = useState<{min: string, max: string} | null>(null);
  const [isLoadingRange, setIsLoadingRange] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState({ text: '', type: '' });
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const modules = [
    { value: 'orders', label: 'Đơn hàng & Thanh toán' },
    { value: 'inventory', label: 'Lịch sử Kho & Giao dịch' },
    { value: 'sessions', label: 'Phiên phục vụ Bàn' },
    { value: 'resigned_staff', label: 'Nhân viên đã nghỉ' },
    { value: 'all_transactions', label: 'Tất cả dữ liệu giao dịch' },
  ];


  React.useEffect(() => {
    if (activeTab !== 'data') return;
    
    const fetchDataRange = async () => {
      setIsLoadingRange(true);
      try {
        const res = await api.get('/api/settings/data-range', { params: { module } });
        if (res.data.minDate && res.data.maxDate) {
          setDataRange({
            min: new Date(res.data.minDate).toLocaleDateString('vi-VN'),
            max: new Date(res.data.maxDate).toLocaleDateString('vi-VN')
          });
        } else {
          setDataRange(null);
        }
      } catch (err) {
        console.error('Lỗi khi lấy khoảng thời gian dữ liệu:', err);
        setDataRange(null);
      } finally {
        setIsLoadingRange(false);
      }
    };
    fetchDataRange();
  }, [module, activeTab]);

  const handleExport = async () => {
    if (!exportStartDate || !exportEndDate) {
      alert('Vui lòng chọn khoảng ngày cần tải dữ liệu.');
      return;
    }
    const start = new Date(`${exportStartDate}T00:00:00`);
    const end = new Date(`${exportEndDate}T23:59:59`);
    const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (days < 0 || days > 31) {
      alert('Khoảng tải dữ liệu tối đa là 31 ngày.');
      return;
    }
    try {
      setIsExporting(true);
      const params = {
        startDate: `${exportStartDate}T00:00:00`,
        endDate: `${exportEndDate}T23:59:59`,
      };
      
      const response = await api.get('/api/settings/export/zip', {
        params,
        responseType: 'blob', // Important for downloading files
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ViePOS_Data_Export_${new Date().getTime()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Tải dữ liệu thất bại. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!startDate || !endDate) return;
    
    try {
      setIsDeleting(true);
      setDeleteMessage({ text: '', type: '' });
      
      await api.delete('/api/settings/data', {
        params: {
          module,
          startDate: `${startDate}T00:00:00`,
          endDate: `${endDate}T23:59:59`
        }
      });
      
      setDeleteMessage({ text: 'Đã xóa dữ liệu thành công!', type: 'success' });
      setShowConfirmModal(false);
      setStartDate('');
      setEndDate('');
    } catch (error: any) {
      console.error('Delete failed:', error);
      setDeleteMessage({ 
        text: error.response?.data?.message || 'Có lỗi xảy ra khi xóa dữ liệu.', 
        type: 'error' 
      });
      setShowConfirmModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const getModuleName = (val: string) => modules.find(m => m.value === val)?.label || '';

  const currentUserRole = localStorage.getItem('role') || 'STAFF';
  const isRootAdmin = currentUserRole === 'ROOT_ADMIN';

  if (!isRootAdmin) {
    return (
      <div className="settings-page-container">
        <div className="settings-header">
          <h1 className="settings-title">Thiết Lập Hệ Thống</h1>
        </div>
        <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', marginTop: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#fff0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={40} color="#d32f2f" />
            </div>
          </div>
          <h2 style={{ color: '#d32f2f', marginBottom: '12px', fontSize: '1.5rem', fontWeight: 600 }}>Không có quyền truy cập</h2>
          <p style={{ color: '#555', maxWidth: '450px', margin: '0 auto', lineHeight: '1.6', fontSize: '15px' }}>
            Tài khoản Quản lý của bạn không được cấp quyền truy cập vào mục Dữ liệu & Phân quyền. <br/>Vui lòng liên hệ <strong>Chủ quán</strong> nếu bạn cần hỗ trợ.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page-container">
      <div className="settings-header">
        <h1 className="settings-title">Thiết Lập Hệ Thống</h1>
      </div>

      <div style={{ display: "flex", gap: "20px", borderBottom: "1px solid #ddd", marginBottom: "24px" }}>
        <div
          className={`admin-tab ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
          style={{ padding: "12px 16px", fontSize: "15px", cursor: "pointer", fontWeight: activeTab === 'data' ? 'bold' : 'normal', color: activeTab === 'data' ? '#256E05' : '#666', borderBottom: activeTab === 'data' ? '2px solid #256E05' : '2px solid transparent' }}
        >
          Quản lý Dữ liệu
        </div>
        <div
          className={`admin-tab ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
          style={{ padding: "12px 16px", fontSize: "15px", cursor: "pointer", fontWeight: activeTab === 'roles' ? 'bold' : 'normal', color: activeTab === 'roles' ? '#256E05' : '#666', borderBottom: activeTab === 'roles' ? '2px solid #256E05' : '2px solid transparent' }}
        >
          Phân quyền Vai trò
        </div>
      </div>

      {activeTab === 'data' && (
        <div className="settings-tab-content fade-in">
          {/* Export Section */}
          <div className="settings-section">
            <h2 className="settings-section-title">
              <Download size={20} color="#256E05" /> Sao lưu & Tải Dữ Liệu
            </h2>
            <p className="settings-section-desc">
              Tải toàn bộ dữ liệu của hệ thống (Đơn hàng, Sản phẩm, Nhân viên, Tồn kho...) dưới dạng file nén (.zip) chứa các file CSV.
            </p>
            <div className="settings-form-row">
              <div className="settings-form-group">
                <label>Từ ngày</label>
                <input 
                  type="date" 
                  className="settings-input"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                />
              </div>
              <div className="settings-form-group">
                <label>Đến ngày</label>
                <input 
                  type="date" 
                  className="settings-input"
                  value={exportEndDate}
                  min={exportStartDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                />
              </div>
            </div>
            
            <button 
              className="btn-export-data" 
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download size={18} />
              {isExporting ? 'Đang chuẩn bị dữ liệu...' : 'TẢI DỮ LIỆU (.ZIP)'}
            </button>
          </div>

          {/* Delete Section */}
          <div className="settings-section">
            <h2 className="settings-section-title" style={{ color: '#c62828' }}>
              <Trash2 size={20} color="#c62828" /> Xóa Dữ Liệu Cũ
            </h2>
            <p className="settings-section-desc">
              Chức năng này sẽ <strong>xóa cứng vĩnh viễn</strong> các dữ liệu giao dịch trong khoảng thời gian được chọn để giải phóng dung lượng. Hãy sao lưu dữ liệu trước khi thực hiện. (Dữ liệu gốc như Sản phẩm, Nhân sự sẽ không bị xóa để tránh lỗi hệ thống).
            </p>

            <div style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#555' }}>
              <Calendar size={18} color="#256E05" />
              <span>
                Dữ liệu của phân hệ <strong>{getModuleName(module)}</strong> hiện có từ: {' '}
                {isLoadingRange ? 'Đang tải...' : (dataRange ? <strong style={{color: '#256E05'}}>{dataRange.min} đến {dataRange.max}</strong> : <strong>Chưa có dữ liệu</strong>)}
              </span>
            </div>

            <div className="settings-form-row">
              <div className="settings-form-group">
                <label>Phân hệ dữ liệu</label>
                <CustomSelect
                  options={modules}
                  value={module}
                  onChange={(val) => setModule(val)}
                  placeholder="Chọn phân hệ..."
                />
              </div>
              <div className="settings-form-group">
                <label>Từ ngày</label>
                <input 
                  type="date" 
                  className="settings-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || undefined}
                />
              </div>
              <div className="settings-form-group">
                <label>Đến ngày</label>
                <input 
                  type="date" 
                  className="settings-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                />
              </div>
            </div>

            {deleteMessage.text && (
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: '8px', 
                marginBottom: '16px',
                backgroundColor: deleteMessage.type === 'success' ? '#e8f5e9' : '#ffebee',
                color: deleteMessage.type === 'success' ? '#2e7d32' : '#c62828',
                fontSize: '14px',
                fontWeight: 500
              }}>
                {deleteMessage.text}
              </div>
            )}

            <button 
              className="btn-delete-data"
              disabled={!startDate || !endDate || isDeleting}
              onClick={() => setShowConfirmModal(true)}
            >
              <Trash2 size={18} />
              {isDeleting ? 'ĐANG XÓA...' : 'XÓA DỮ LIỆU ĐÃ CHỌN'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="settings-tab-content fade-in">
          <div className="settings-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 className="settings-section-title" style={{ marginBottom: '4px' }}>
                  <Shield size={20} color="#256E05" /> Bảng Phân Quyền
                </h2>
                <p className="settings-section-desc" style={{ marginBottom: 0 }}>
                  Cấu hình chi tiết quyền hạn cho các vai trò trong hệ thống (Root Admin mặc định có toàn quyền).
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {!isEditingRoles ? (
                  <button className="btn-add-staff" style={{ padding: '8px 16px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd' }} onClick={() => setIsEditingRoles(true)}>
                    <Edit2 size={16} style={{ marginRight: '6px' }} />
                    Chỉnh sửa quyền
                  </button>
                ) : (
                  <>
                    <button className="btn-add-staff" style={{ padding: '8px 16px', backgroundColor: '#fff', color: '#666', border: '1px solid #ddd' }} onClick={handleCancelRoles}>
                      <X size={16} style={{ marginRight: '6px' }} />
                      Hủy bỏ
                    </button>
                    <button 
                      className="btn-add-staff" 
                      style={{ padding: '8px 16px', opacity: hasRoleChanges ? 1 : 0.5, cursor: hasRoleChanges ? 'pointer' : 'not-allowed' }} 
                      onClick={hasRoleChanges ? handleSaveRoles : undefined}
                      disabled={!hasRoleChanges}
                    >
                      <Check size={16} style={{ marginRight: '6px' }} />
                      Lưu thay đổi
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e0e0e0', backgroundColor: '#fff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '16px', fontWeight: 600, color: '#374151', width: '50%' }}>Phân hệ / Thao tác</th>
                    <th style={{ padding: '16px', fontWeight: 600, color: '#374151', textAlign: 'center', width: '25%' }}>Root Admin<br/><span style={{fontSize: '12px', fontWeight: 'normal', color: '#6b7280'}}>(Chủ quán)</span></th>
                    <th style={{ padding: '16px', fontWeight: 600, color: '#374151', textAlign: 'center', width: '25%' }}>Nhân viên<br/><span style={{fontSize: '12px', fontWeight: 'normal', color: '#6b7280'}}>(Staff)</span></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Nhóm 1: Bán hàng */}
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <td colSpan={3} style={{ padding: '10px 16px', fontWeight: 600, color: '#111827', fontSize: '14px' }}>Quản lý Bán hàng (POS)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>Truy cập màn hình POS (Bán hàng)</td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked disabled /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={staffPermissions.pos_view} onChange={() => togglePermission('pos_view')} disabled={!isEditingRoles} /></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>Tạo đơn hàng & Thanh toán</td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked disabled /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={staffPermissions.pos_order} onChange={() => togglePermission('pos_order')} disabled={!isEditingRoles} /></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>Cấp phát & Thu hồi thẻ</td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked disabled /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={staffPermissions.pos_card} onChange={() => togglePermission('pos_card')} disabled={!isEditingRoles} /></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>Hủy đơn hàng / Hoàn tiền</td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked disabled /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={staffPermissions.pos_cancel} onChange={() => togglePermission('pos_cancel')} disabled={!isEditingRoles} /></td>
                  </tr>

                  {/* Nhóm 2: Sản phẩm */}
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <td colSpan={3} style={{ padding: '10px 16px', fontWeight: 600, color: '#111827', fontSize: '14px' }}>Quản lý Sản phẩm & Bàn</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>Xem danh sách Sản phẩm / Bàn</td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked disabled /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={staffPermissions.prod_view} onChange={() => togglePermission('prod_view')} disabled={!isEditingRoles} /></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>Thêm / Sửa / Xóa Sản phẩm</td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked disabled /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={staffPermissions.prod_edit} onChange={() => togglePermission('prod_edit')} disabled={!isEditingRoles} /></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>Thêm / Sửa / Xóa Bàn</td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked disabled /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={staffPermissions.table_edit} onChange={() => togglePermission('table_edit')} disabled={!isEditingRoles} /></td>
                  </tr>

                  {/* Nhóm 3: Kho hàng */}
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <td colSpan={3} style={{ padding: '10px 16px', fontWeight: 600, color: '#111827', fontSize: '14px' }}>Quản lý Kho hàng</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>Xem tồn kho & Lịch sử giao dịch</td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked disabled /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={staffPermissions.inv_view} onChange={() => togglePermission('inv_view')} disabled={!isEditingRoles} /></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>Tạo phiếu Nhập / Xuất kho</td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked disabled /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={staffPermissions.inv_edit} onChange={() => togglePermission('inv_edit')} disabled={!isEditingRoles} /></td>
                  </tr>

                  {/* Nhóm 4: Nhân sự */}
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <td colSpan={3} style={{ padding: '10px 16px', fontWeight: 600, color: '#111827', fontSize: '14px' }}>Quản lý Nhân sự</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>Xem danh sách nhân viên</td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked disabled /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={staffPermissions.staff_view} onChange={() => togglePermission('staff_view')} disabled={!isEditingRoles} /></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>Duyệt yêu cầu (Cấp tài khoản / Đổi mã PIN)</td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked disabled /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={staffPermissions.staff_approve} onChange={() => togglePermission('staff_approve')} disabled={!isEditingRoles} /></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>Thêm / Sửa / Xóa nhân viên</td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked disabled /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={staffPermissions.staff_edit} onChange={() => togglePermission('staff_edit')} disabled={!isEditingRoles} /></td>
                  </tr>

                  {/* Nhóm 5: Hệ thống */}
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <td colSpan={3} style={{ padding: '10px 16px', fontWeight: 600, color: '#111827', fontSize: '14px' }}>Báo cáo & Hệ thống</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>Xem biểu đồ doanh thu</td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked disabled /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={staffPermissions.report_view} onChange={() => togglePermission('report_view')} disabled={!isEditingRoles} /></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>Tải dữ liệu sao lưu (.zip)</td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked disabled /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={staffPermissions.sys_export} onChange={() => togglePermission('sys_export')} disabled={!isEditingRoles} /></td>
                  </tr>
                  <tr>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>Xóa dữ liệu cũ hệ thống</td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked disabled /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={staffPermissions.sys_delete} onChange={() => togglePermission('sys_delete')} disabled={!isEditingRoles} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="settings-modal-overlay">
          <div className="settings-modal-content">
            <div className="settings-modal-header">
              <AlertTriangle size={24} color="#c62828" />
              <h3>CẢNH BÁO XÓA DỮ LIỆU</h3>
            </div>
            <div className="settings-modal-body">
              Bạn đang yêu cầu xóa vĩnh viễn dữ liệu <strong>{getModuleName(module)}</strong>.<br/><br/>
              Khoảng thời gian: <strong>{startDate.split('-').reverse().join('/')}</strong> đến <strong>{endDate.split('-').reverse().join('/')}</strong>.<br/><br/>
              <span style={{ color: '#c62828', fontWeight: 600 }}>Hành động này KHÔNG THỂ HOÀN TÁC. Bạn có chắc chắn muốn tiếp tục?</span>
            </div>
            <div className="settings-modal-footer">
              <button 
                className="settings-btn-cancel"
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
              >
                Hủy bỏ
              </button>
              <button 
                className="settings-btn-confirm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
