import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, X, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../services/api';
import { canAccessManagement, canAccessPos, isStaffRole, getAuthRole, MANAGEMENT_HOME } from '../utils/auth';
import './StaffLoginPage.css';

export default function StaffLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Forgot PIN state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleTogglePin = () => {
    setShowPin(true);
    setTimeout(() => setShowPin(false), 3000);
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEmailBlur = () => {
    if (email && !validateEmail(email)) {
      setEmailError('Email không hợp lệ (VD: abc@gmail.com)');
    }
  };

  useEffect(() => {
    if (canAccessManagement()) {
      navigate(MANAGEMENT_HOME, { replace: true });
      return;
    }
    if (canAccessPos() && isStaffRole(getAuthRole())) {
      navigate('/pos/sales', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handlePinChange = (index: number, value: string) => {
    // Allow only numbers
    if (value && !/^\d+$/.test(value)) return;
    setError('');

    const newPin = [...pin];
    // Keep only the last character if they pasted multiple
    newPin[index] = value.slice(-1);
    setPin(newPin);

    // Auto-advance to next input if value is typed
    if (value && index < 5) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Auto-focus previous input on backspace if current is empty
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    
    if (!validateEmail(email)) {
      setEmailError('Email không hợp lệ (VD: abc@gmail.com)');
      return;
    }

    const fullPin = pin.join('');
    if (fullPin.length !== 6) {
      setError('Vui lòng nhập đủ 6 số mã PIN');
      return;
    }
    
    if (email && fullPin.length === 6) {
      try {
        setIsSubmitting(true);
        const res = await authAPI.staffLogin({ email, pin: fullPin });
        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('role', res.data.role);
          localStorage.setItem('staffEmail', email);
          if (res.data.name) localStorage.setItem('staffName', res.data.name);
          // staffId phải là employeeId dạng "EMPxxx" để filter đơn hàng theo nhân viên
          // res.data.employeeId = "EMPxxx" (Employee.employeeId), res.data.id = UUID của User
          if (res.data.employeeId) localStorage.setItem('staffId', res.data.employeeId);
          else if (res.data.id) localStorage.setItem('staffId', String(res.data.id));
          if (res.data.phone) localStorage.setItem('staffPhone', res.data.phone);
          
          const now = new Date();
          const formattedTime = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          localStorage.setItem('lastLoginTime', formattedTime);
          
          navigate('/pos/sales');
        }
      } catch (err: any) {
        setError('Email hoặc mã PIN không chính xác.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  return (
    <div className="staff-login-container">
      <div className="staff-login-card">
        
        <div className="staff-login-header" style={{ marginBottom: '40px' }}>
          <button className="staff-back-btn" onClick={() => navigate('/')}>
            <ChevronLeft size={18} />
          </button>
          <h1 className="staff-login-title">Đăng Nhập - Nhân Viên</h1>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          <div className="staff-form-group">
            <label>Email</label>
            <div className="staff-email-input-wrapper" style={{ border: emailError ? '1px solid #c62828' : 'none', borderRadius: '8px' }}>
              <input 
                type="text" 
                placeholder="abc@gmail.com" 
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); setEmailError(''); }}
                onBlur={handleEmailBlur}
                required
              />
              {email && (
                <button type="button" className="staff-clear-btn" onClick={() => { setEmail(''); setError(''); setEmailError(''); }}>
                  <X size={18} />
                </button>
              )}
            </div>
            {emailError && <div style={{ position: 'absolute', bottom: '-18px', left: '4px', color: '#c62828', fontSize: '11px', whiteSpace: 'nowrap' }}>{emailError}</div>}
          </div>

          <div className="staff-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ marginBottom: 0 }}>Mã PIN</label>
              <button type="button" onClick={handleTogglePin} style={{ background: 'none', border: 'none', padding: 0, color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                {showPin ? <Eye size={16} color="#256E05" /> : <EyeOff size={16} />}
              </button>
            </div>
            <div className="staff-pin-grid">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={pinRefs[index]}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  className="staff-pin-input"
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(index, e)}
                  maxLength={1}
                  required
                />
              ))}
            </div>
          </div>

          <div className="staff-options-row">
            {/* <label className="staff-fast-login">
              <input type="checkbox" />
              <span>Đăng nhập nhanh</span>
            </label> */}
            <span onClick={() => setIsForgotModalOpen(true)} className="staff-forgot-pin" style={{ cursor: 'pointer', marginLeft: 'auto' }}>Quên Mã PIN?</span>
          </div>

          <button type="submit" className="staff-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Đang xử lý...' : 'Đăng Nhập'}
          </button>

          <div className="staff-footer" style={{ marginTop: '15px' }}>
            Chưa có tài khoản? <span onClick={() => navigate('/register/staff')} style={{ color: '#256E05', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Đăng Ký</span>
          </div>

          {/* Toast Notification */}
          {error && (
            <div style={{ 
              position: 'fixed', 
              bottom: '24px', 
              left: '50%', 
              transform: 'translateX(-50%)', 
              backgroundColor: '#ffebee', 
              color: '#c62828', 
              padding: '12px 24px', 
              borderRadius: '8px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: '13px', 
              textAlign: 'center',
              zIndex: 1000,
              width: 'max-content',
              maxWidth: '90vw'
            }}>
              {error}
            </div>
          )}
        </form>

          {/* Forgot PIN Modal */}
          {isForgotModalOpen && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999
            }}>
              <div style={{
                backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#111' }}>Cấp Lại Mã PIN</h3>
                <p style={{ margin: '0 0 24px', color: '#555', lineHeight: 1.5, fontSize: '14px' }}>
                  Vui lòng liên hệ quản lý ca để xác minh và cấp lại mã PIN.
                </p>
                <button type="button" onClick={() => setIsForgotModalOpen(false)} style={{ padding: '12px', backgroundColor: '#256E05', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Đã hiểu</button>
              </div>
            </div>
          )}

      </div>
    </div>
  );
}
