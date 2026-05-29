import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../services/api';
import './StaffLoginPage.css';

export default function StaffRegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [pinError, setPinError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleTogglePin = () => {
    setShowPin(true);
    setTimeout(() => setShowPin(false), 3000);
  };

  useEffect(() => {
    if (formError) {
      const timer = setTimeout(() => setFormError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [formError]);

  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const [confirmPin, setConfirmPin] = useState(['', '', '', '', '', '']);
  const confirmPinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

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
      setPhoneError('Số điện thoại không hợp lệ (Phải bắt đầu bằng 0, từ 10-11 số)');
    }
  };

  // Real-time PIN match check
  useEffect(() => {
    const fullPin = pin.join('');
    const fullConfirmPin = confirmPin.join('');
    // Only check if both are fully entered to avoid annoying errors while typing
    if (fullPin.length === 6 && fullConfirmPin.length === 6) {
      if (fullPin !== fullConfirmPin) {
        setPinError('Mã PIN xác nhận không khớp!');
      } else {
        setPinError(''); // Clear error if they fix it
      }
    } else {
      // If user deletes characters, we can remove the error until they finish typing 6 digits again
      if (pinError) setPinError('');
    }
  }, [pin, confirmPin]);

  const handlePinChange = (index: number, value: string, isConfirm: boolean) => {
    if (value && !/^\d+$/.test(value)) return;
    setPinError('');

    const targetArray = isConfirm ? [...confirmPin] : [...pin];
    targetArray[index] = value.slice(-1);
    
    if (isConfirm) {
      setConfirmPin(targetArray);
    } else {
      setPin(targetArray);
    }

    if (value && index < 5) {
      const refs = isConfirm ? confirmPinRefs : pinRefs;
      refs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>, isConfirm: boolean) => {
    const targetArray = isConfirm ? confirmPin : pin;
    if (e.key === 'Backspace' && !targetArray[index] && index > 0) {
      const refs = isConfirm ? confirmPinRefs : pinRefs;
      refs[index - 1].current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setEmailError('');
    setPhoneError('');
    setPinError('');

    let isValid = true;

    if (!validateEmail(email)) {
      setEmailError('Email không hợp lệ (VD: abc@gmail.com)');
      isValid = false;
    }

    if (!validatePhone(phone)) {
      setPhoneError('Số điện thoại không hợp lệ (Phải bắt đầu bằng 0, từ 10-11 số)');
      isValid = false;
    }

    const fullPin = pin.join('');
    const fullConfirmPin = confirmPin.join('');
    
    if (fullPin.length < 6) {
      setPinError('Vui lòng nhập đủ 6 số mã PIN');
      isValid = false;
    } else if (fullPin !== fullConfirmPin) {
      setPinError('Mã PIN xác nhận không khớp!');
      isValid = false;
    }
    
    if (!isValid) return;

    try {
      setIsSubmitting(true);
      await authAPI.staffRegister({
        name,
        email,
        phone,
        pin: fullPin
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
      <div className="staff-login-container">
        <div className="staff-login-card" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f0f8ec', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#256E05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h2 style={{ color: '#256E05', marginBottom: '16px' }}>Đăng Ký Thành Công</h2>
          <p style={{ color: '#555', marginBottom: '32px', lineHeight: '1.5' }}>
            Tài khoản của bạn đã được gửi yêu cầu.<br/>Vui lòng chờ Quản lý duyệt trước khi đăng nhập.
          </p>
          <button className="staff-submit-btn" onClick={() => navigate('/login/staff')}>
            Về trang Đăng Nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-login-container">
      <div className="staff-login-card">
        
        <div className="staff-login-header" style={{ marginBottom: '10px' }}>
          <h1 className="staff-login-title">Đăng Ký Tài Khoản</h1>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          <div className="staff-form-group">
            <label>Họ và tên</label>
            <div className="staff-email-input-wrapper">
              <input 
                type="text" 
                placeholder="Hãy nhập chính xác Họ và tên của bạn" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              {name && (
                <button type="button" className="staff-clear-btn" onClick={() => setName('')}>
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          <div className="staff-form-group">
            <label>Email</label>
            <div className="staff-email-input-wrapper" style={{ border: emailError ? '1px solid #c62828' : 'none', borderRadius: '8px' }}>
              <input 
                type="text" 
                placeholder="Email của bạn sẽ sử dụng cho Đăng nhập" 
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                onBlur={handleEmailBlur}
                required
              />
              {email && (
                <button type="button" className="staff-clear-btn" onClick={() => { setEmail(''); setEmailError(''); }}>
                  <X size={18} />
                </button>
              )}
            </div>
            {emailError && <div style={{ position: 'absolute', bottom: '-18px', left: '4px', color: '#c62828', fontSize: '11px', whiteSpace: 'nowrap' }}>{emailError}</div>}
          </div>

          <div className="staff-form-group">
            <label>Số điện thoại</label>
            <div className="staff-email-input-wrapper" style={{ border: phoneError ? '1px solid #c62828' : 'none', borderRadius: '8px' }}>
              <input 
                type="text" 
                placeholder="Hãy nhập số điện thoại của bạn" 
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                onBlur={handlePhoneBlur}
                required
              />
              {phone && (
                <button type="button" className="staff-clear-btn" onClick={() => { setPhone(''); setPhoneError(''); }}>
                  <X size={18} />
                </button>
              )}
            </div>
            {phoneError && <div style={{ position: 'absolute', bottom: '-18px', left: '4px', color: '#c62828', fontSize: '11px', whiteSpace: 'nowrap' }}>{phoneError}</div>}
          </div>

          <div className="staff-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ marginBottom: 0 }}>Mã PIN (6 số)</label>
              <button type="button" onClick={handleTogglePin} style={{ background: 'none', border: 'none', padding: 0, color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                {showPin ? <Eye size={16} color="#256E05" /> : <EyeOff size={16} />}
              </button>
            </div>
            <div className="staff-pin-grid">
              {pin.map((digit, index) => (
                <input
                  key={`pin-${index}`}
                  ref={pinRefs[index]}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  className="staff-pin-input"
                  style={{ border: pinError ? '1px solid #c62828' : 'none' }}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value, false)}
                  onKeyDown={(e) => handlePinKeyDown(index, e, false)}
                  maxLength={1}
                  required
                />
              ))}
            </div>
          </div>

          <div className="staff-form-group" style={{ marginBottom: '32px' }}>
            <label>Nhập lại Mã PIN</label>
            <div className="staff-pin-grid">
              {confirmPin.map((digit, index) => (
                <input
                  key={`confirm-${index}`}
                  ref={confirmPinRefs[index]}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  className="staff-pin-input"
                  style={{ border: pinError ? '1px solid #c62828' : 'none' }}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value, true)}
                  onKeyDown={(e) => handlePinKeyDown(index, e, true)}
                  maxLength={1}
                  required
                />
              ))}
            </div>
            {pinError && <div style={{ position: 'absolute', bottom: '-22px', left: 0, right: 0, color: '#c62828', fontSize: '11px', textAlign: 'center' }}>{pinError}</div>}
          </div>

          <button type="submit" className="staff-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Đang xử lý...' : 'Đăng Ký'}
          </button>

          <div className="staff-footer" style={{ marginTop: '15px' }}>
            Bạn đã có tài khoản? <span onClick={() => navigate('/login/staff')} style={{ color: '#256E05', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Đăng Nhập Ngay</span>
          </div>

          {/* Toast Notification */}
          {formError && (
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
              {formError}
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
