import { Outlet } from 'react-router-dom';
import bgLogin from '../../assets/BG/bg_login.png';
import logoName from '../../assets/favicon/logoname.png';
import './AuthLayout.css';

export default function AuthLayout() {
  return (
    <div className="auth-layout-container">
      <div className="auth-left-panel">
        <img src={bgLogin} alt="Login Background" style={{ height: '100%', width: 'auto', display: 'block' }} />
      </div>
      <div className="auth-right-panel">
        <img src={logoName} alt="ViePOS" className="auth-logo-corner" />
        <Outlet />
      </div>
    </div>
  );
}
