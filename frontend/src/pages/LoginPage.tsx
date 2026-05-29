import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { canAccessManagement, MANAGEMENT_HOME } from '../utils/auth';
import xGreyIcon from '../../assets/icon/x_grey.png';
import closeEyeIcon from '../../assets/icon/close_eye_grey.png';
import openEyeIcon from '../../assets/icon/open_eye_grey.png';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Chỉ tự chuyển dashboard nếu đã đăng nhập Quản lý; nhân viên (POS) vẫn xem được form đăng nhập Quản lý
  useEffect(() => {
    if (canAccessManagement()) {
      navigate(MANAGEMENT_HOME, { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role ?? 'MANAGER');
      localStorage.setItem('staffEmail', email);
      if (res.data.name) localStorage.setItem('staffName', res.data.name);
      navigate(MANAGEMENT_HOME);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Email hoặc mật khẩu không đúng.');
      } else {
        setError('Có lỗi xảy ra, vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-inner-container">


      <h3 className="login-title">Đăng Nhập - Quản Lý</h3>

      <form onSubmit={handleSubmit} className="login-form">
        <div className="field-group">
          <label htmlFor="email">Email</label>
          <div className="input-wrapper">
            <input
              id="email"
              type="email"
              placeholder="abc@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {email && (
            <img
                src={xGreyIcon}
                alt="Xoá"
                className="input-icon-right"
                onClick={() => setEmail('')}
              />
            )}
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="password">Mật khẩu</label>
          <div className="input-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <img
              src={showPassword ? openEyeIcon : closeEyeIcon}
              alt={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="input-icon-right"
              onClick={() => setShowPassword(prev => !prev)}
            />
          </div>
        </div>

        {error && <p className="login-error">{error}</p>}

        <div className="login-options-row">
          {/* <label className="login-fast-login">
            <input type="checkbox" />
            <span>Đăng nhập nhanh</span>
          </label> */}
          <div className="forgot-password" style={{ marginLeft: 'auto' }}>
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </div>
        </div>

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
        </button>

        <div className="login-footer">
          Chưa có tài khoản? <Link to="/register/manager" style={{ color: '#256E05', fontWeight: 600, textDecoration: 'none' }}>Đăng Ký</Link>
        </div>
      </form>
    </div>
  );
}
