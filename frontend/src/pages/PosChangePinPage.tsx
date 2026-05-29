import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../services/api';
import './PosChangePinPage.css';

export default function PosChangePinPage() {
  const navigate = useNavigate();

  const [oldPin, setOldPin] = useState(['', '', '', '', '', '']);
  const [newPin, setNewPin] = useState(['', '', '', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '', '', '']);

  const [showOldPin, setShowOldPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const [oldPinError, setOldPinError] = useState('');
  const [newPinError, setNewPinError] = useState('');
  const [confirmPinError, setConfirmPinError] = useState('');

  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Focus refs
  const oldPinRefs = Array(6).fill(0).map(() => useRef<HTMLInputElement>(null));
  const newPinRefs = Array(6).fill(0).map(() => useRef<HTMLInputElement>(null));
  const confirmPinRefs = Array(6).fill(0).map(() => useRef<HTMLInputElement>(null));

  useEffect(() => {
    let t1: any, t2: any, t3: any;
    if (showOldPin) t1 = setTimeout(() => setShowOldPin(false), 3000);
    if (showNewPin) t2 = setTimeout(() => setShowNewPin(false), 3000);
    if (showConfirmPin) t3 = setTimeout(() => setShowConfirmPin(false), 3000);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [showOldPin, showNewPin, showConfirmPin]);

  useEffect(() => {
    if (submitError || success) {
      const timer = setTimeout(() => {
        setSubmitError('');
        if (success) {
          navigate('/pos/account');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [submitError, success, navigate]);

  const verifyOldPin = async (pinStr: string) => {
    const email = localStorage.getItem('staffEmail');
    if (!email) return;
    try {
      await authAPI.verifyPin({ email, pin: pinStr });
      setOldPinError(''); // Success
    } catch (err) {
      setOldPinError('Mã PIN cũ không chính xác');
    }
  };

  const verifyNewPinVsDb = async (pinStr: string) => {
    const email = localStorage.getItem('staffEmail');
    if (!email) return;
    try {
      // Nếu API này trả về thành công nghĩa là mã PIN mới TRÙNG với mã PIN đang lưu trong DB
      await authAPI.verifyPin({ email, pin: pinStr });
      setNewPinError('Mã PIN mới không được trùng với mã PIN cũ');
    } catch (err) {
      // Bị lỗi 401 nghĩa là mã PIN mới KHÁC với mã trong DB -> Hợp lệ!
      setNewPinError('');
      
      // Re-validate confirm if it was already filled
      const confP = confirmPin.join('');
      if (confP.length === 6) {
        if (confP !== pinStr) {
          setConfirmPinError('Mã PIN không khớp');
        } else {
          setConfirmPinError('');
        }
      }
    }
  };

  const handlePinChange = (
    index: number,
    value: string,
    pinState: string[],
    setPinState: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.RefObject<HTMLInputElement | null>[],
    type: 'old' | 'new' | 'confirm'
  ) => {
    if (value && !/^\d+$/.test(value)) return;

    const newArr = [...pinState];
    newArr[index] = value.slice(-1);
    setPinState(newArr);

    if (value && index < 5) {
      refs[index + 1].current?.focus();
    }

    // Instant Validation when the 6th digit is typed
    if (value && index === 5) {
      const fullPin = newArr.join('');
      if (type === 'old') {
        verifyOldPin(fullPin);
      } else if (type === 'new') {
        verifyNewPinVsDb(fullPin);
      } else if (type === 'confirm') {
        const newP = newPin.join('');
        if (fullPin !== newP) {
          setConfirmPinError('Mã PIN không khớp');
        } else {
          setConfirmPinError('');
        }
      }
    } else {
      // Clear errors while typing (optional, makes it less aggressive)
      if (type === 'old') setOldPinError('');
      if (type === 'new') setNewPinError('');
      if (type === 'confirm') setConfirmPinError('');
    }
  };

  const handlePinKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    pinState: string[],
    refs: React.RefObject<HTMLInputElement | null>[]
  ) => {
    if (e.key === 'Backspace' && !pinState[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  const renderPinGroup = (
    label: string,
    pinState: string[],
    setPinState: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.RefObject<HTMLInputElement | null>[],
    type: 'old' | 'new' | 'confirm',
    showPin: boolean,
    setShowPin: React.Dispatch<React.SetStateAction<boolean>>,
    errorMsg: string
  ) => (
    <div className="pin-group">
      <div className="pin-label-row">
        <div className="pin-label">{label}</div>
        <button 
          className="eye-btn" 
          onClick={() => setShowPin(!showPin)}
          title={showPin ? "Ẩn mã PIN" : "Hiện mã PIN"}
        >
          {showPin ? <EyeOff size={16} color="#666" /> : <Eye size={16} color="#666" />}
        </button>
      </div>
      <div className="pin-inputs-container">
        {pinState.map((digit, index) => (
          <input
            key={index}
            ref={refs[index]}
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            className={`pin-box ${errorMsg ? 'error-box' : ''}`}
            value={digit}
            onChange={(e) => handlePinChange(index, e.target.value, pinState, setPinState, refs, type)}
            onKeyDown={(e) => handlePinKeyDown(index, e, pinState, refs)}
            disabled={isSubmitting}
          />
        ))}
      </div>
      <div className="inline-error-wrapper">
        {errorMsg && <div className="inline-error">{errorMsg}</div>}
      </div>
    </div>
  );

  const isFormValid = () => {
    const oldP = oldPin.join('');
    const newP = newPin.join('');
    const confirmP = confirmPin.join('');
    
    return (
      oldP.length === 6 &&
      newP.length === 6 &&
      confirmP.length === 6 &&
      !oldPinError &&
      !newPinError &&
      !confirmPinError
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    const email = localStorage.getItem('staffEmail');
    if (!email) {
      setSubmitError('Lỗi phiên đăng nhập. Vui lòng đăng nhập lại.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await authAPI.requestPinChange({ 
        email, 
        oldPin: oldPin.join(''), 
        newPin: newPin.join('') 
      });
      if (res.data.ok) {
        setSuccess('Gửi yêu cầu đổi mã PIN thành công! Chờ Quản lý duyệt.');
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="change-pin-container">
      <div className="change-pin-header">
        <button className="back-btn" onClick={() => navigate('/pos/account')}>
          <ChevronLeft size={20} color="#306B0E" />
        </button>
        <h2 className="change-pin-title">Đổi mã PIN</h2>
      </div>

      <div className="change-pin-content">
        {renderPinGroup('Mã PIN cũ', oldPin, setOldPin, oldPinRefs, 'old', showOldPin, setShowOldPin, oldPinError)}
        {renderPinGroup('Mã PIN mới', newPin, setNewPin, newPinRefs, 'new', showNewPin, setShowNewPin, newPinError)}
        {renderPinGroup('Nhập lại mã PIN', confirmPin, setConfirmPin, confirmPinRefs, 'confirm', showConfirmPin, setShowConfirmPin, confirmPinError)}

        <button 
          className="submit-pin-btn" 
          onClick={handleSubmit}
          disabled={!isFormValid() || isSubmitting}
        >
          {isSubmitting ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
        </button>

        <div className="bottom-message-wrapper">
          {submitError && <div className="error-message">{submitError}</div>}
          {success && <div className="success-message">{success}</div>}
        </div>
      </div>
    </div>
  );
}
