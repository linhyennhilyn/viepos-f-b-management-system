import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import xGreyIcon from '../../assets/icon/x_grey.png';
import closeEyeIcon from '../../assets/icon/close_eye_grey.png';
import openEyeIcon from '../../assets/icon/open_eye_grey.png';
import './LoginPage.css';

export default function AdminRegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (formError) {
      const timer = setTimeout(() => setFormError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [formError]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string) => {
    const re = /^0[0-9]{9,10}$/;
    return re.test(phone);
  };

  const handleEmailBlur = () => {
    if (email && !validateEmail(email)) {
      setEmailError('Email không hợp lệ (VD: abc@gmail.com)');
    }
  };

  const handlePhoneBlur = () => {
    if (phone && !validatePhone(phone)) {
      setPhoneError('Số điện thoại không hợp lệ (Bắt đầu bằng 0, từ 10-11 số)');
    }
  };

  useEffect(() => {
    if (password && confirmPassword) {
      if (password !== confirmPassword) {
        setPasswordError('Mật khẩu xác nhận không khớp!');
      } else {
        setPasswordError('');
      }
    } else {
      if (passwordError) setPasswordError('');
    }
  }, [password, confirmPassword]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setEmailError('');
    setPhoneError('');
    setPasswordError('');

    let isValid = true;

    if (!validateEmail(email)) {
      setEmailError('Email không hợp lệ');
      isValid = false;
    }

    if (!validatePhone(phone)) {
      setPhoneError('Số điện thoại không hợp lệ');
      isValid = false;
    }

    if (password.length < 6) {
      setPasswordError('Mật khẩu phải dài ít nhất 6 ký tự');
      isValid = false;
    } else if (password !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      isValid = false;
    }
    
    if (!isValid) return;

    try {
      setIsSubmitting(true);
      await authAPI.adminRegister({
        name,
        email,
        phone,
        password
      });
      setIsSuccess(true);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="login-inner-container">
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f0f8ec', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#256E05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h2 style={{ color: '#256E05', marginBottom: '16px', fontSize: '1.5rem', fontWeight: 700 }}>Đăng Ký Thành Công</h2>
          <p style={{ color: '#555', marginBottom: '32px', lineHeight: '1.5' }}>
            Tài khoản Quản lý (Admin) của bạn đã được tạo thành công.<br/>Bạn có thể đăng nhập ngay bây giờ.
          </p>
          <button className="login-btn" onClick={() => navigate('/login/manager')}>
            Về trang Đăng Nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-inner-container">
      <h3 className="login-title">Đăng Ký - Quản Lý</h3>

      <form onSubmit={handleSubmit} className="login-form" style={{ gap: '0.8rem' }}>
        
        <div className="field-group">
          <label>Họ và tên</label>
          <div className="input-wrapper">
            <input 
              type="text" 
              placeholder="Nhập họ và tên" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {name && (
              <img src={xGreyIcon} alt="Xóa" className="input-icon-right" onClick={() => setName('')} />
            )}
          </div>
        </div>

        <div className="field-group">
          <label>Email</label>
          <div className="input-wrapper" style={{ border: emailError ? '1px solid #c62828' : 'none', borderRadius: '8px' }}>
            <input 
              type="email" 
              placeholder="abc@gmail.com" 
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              onBlur={handleEmailBlur}
              required
            />
            {email && (
              <img src={xGreyIcon} alt="Xóa" className="input-icon-right" onClick={() => { setEmail(''); setEmailError(''); }} />
            )}
          </div>
          {emailError && <div style={{ color: '#c62828', fontSize: '0.8rem', marginTop: '-0.2rem' }}>{emailError}</div>}
        </div>

        <div className="field-group">
          <label>Số điện thoại</label>
          <div className="input-wrapper" style={{ border: phoneError ? '1px solid #c62828' : 'none', borderRadius: '8px' }}>
            <input 
              type="tel" 
              placeholder="Nhập số điện thoại" 
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
              onBlur={handlePhoneBlur}
              required
            />
            {phone && (
              <img src={xGreyIcon} alt="Xóa" className="input-icon-right" onClick={() => { setPhone(''); setPhoneError(''); }} />
            )}
          </div>
          {phoneError && <div style={{ color: '#c62828', fontSize: '0.8rem', marginTop: '-0.2rem' }}>{phoneError}</div>}
        </div>

        <div className="field-group">
          <label>Mật khẩu</label>
          <div className="input-wrapper" style={{ border: passwordError ? '1px solid #c62828' : 'none', borderRadius: '8px' }}>
            <input
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

        <div className="field-group">
          <label>Nhập lại mật khẩu</label>
          <div className="input-wrapper" style={{ border: passwordError ? '1px solid #c62828' : 'none', borderRadius: '8px' }}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <img
              src={showConfirmPassword ? openEyeIcon : closeEyeIcon}
              alt={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="input-icon-right"
              onClick={() => setShowConfirmPassword(prev => !prev)}
            />
          </div>
          {passwordError && <div style={{ color: '#c62828', fontSize: '0.8rem', marginTop: '-0.2rem' }}>{passwordError}</div>}
        </div>

        {formError && <p className="login-error" style={{ marginTop: '0.2rem', marginBottom: 0 }}>{formError}</p>}

        <button type="submit" className="login-btn" disabled={isSubmitting} style={{ marginTop: '0.5rem' }}>
          {isSubmitting ? 'Đang xử lý...' : 'Đăng Ký Quản Lý'}
        </button>

        <div className="login-footer">
          Bạn đã có tài khoản? <Link to="/login/manager" style={{ color: '#256E05', fontWeight: 600, textDecoration: 'none' }}>Đăng Nhập Ngay</Link>
        </div>
      </form>
    </div>
  );
}
