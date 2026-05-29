import { useNavigate } from 'react-router-dom';

import './RoleSelectionPage.css';
import heroImg from '../../assets/BG/image_1.png';
import logoName from '../../assets/favicon/logoname.png';
import loginManagerIcon from '../../assets/icon/login_manager.png';
import loginEmployeeIcon from '../../assets/icon/login_employee.png';

export default function RoleSelectionPage() {
  const navigate = useNavigate();

  return (
    <div className="role-selection-container">
      <div className="role-logo-header">
        <img src={logoName} alt="ViePOS" className="role-logo-img" />
        <span>xin chào!</span>
      </div>
      
      <p className="role-subtitle">
        Vui lòng chọn đăng nhập với vai trò Chủ quán<br />
        hoặc Nhân viên để tiếp tục.
      </p>

      <div className="role-illustration">
        <img src={heroImg} alt="Role Selection Illustration" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>

      <div className="role-buttons">
        <button 
          className="role-btn" 
          onClick={() => navigate('/login/manager')}
        >
          <img src={loginManagerIcon} alt="Quản Lý" className="role-btn-icon" />
          Quản Lý
        </button>
        
        <div className="role-divider">Hoặc</div>
        
        <button 
          className="role-btn"
          onClick={() => navigate('/login/staff')}
        >
          <img src={loginEmployeeIcon} alt="Nhân Viên" className="role-btn-icon" />
          Nhân Viên
        </button>
      </div>

      {/* <div className="role-register">
        Chưa có tài khoản? <Link to="/register">Đăng Ký</Link>
      </div> */}
    </div>
  );
}
