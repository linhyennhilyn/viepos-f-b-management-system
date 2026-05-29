'use client';

import { Eye, EyeOff, LockKeyhole, Mail, Store, UserRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateAccountRegistration } from '@/lib/auth/account-registration';
import './login-form.css';
import './create-account-form.css';

export function CreateAccountForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('Nguyễn Minh Anh');
  const [email, setEmail] = useState('staff@viepos.test');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSuccess(false);
    setMessage('');

    const result = validateAccountRegistration({
      email,
      fullName,
      password,
      confirmPassword,
      acceptedTerms,
    });

    if (!result.ok || !result.account) {
      setMessage(result.message ?? 'Không thể tạo tài khoản.');
      return;
    }

    setIsSubmitting(true);
    const response = await fetch('/api/app-auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: result.account.email,
        name: result.account.displayName,
        password,
      }),
    });
    const serverResult = (await response.json()) as { ok: boolean; message?: string };

    if (!response.ok || !serverResult.ok) {
      setMessage(serverResult.message ?? 'Không thể tạo tài khoản.');
      setIsSubmitting(false);
      return;
    }

    setIsSuccess(true);
    setMessage('Tài khoản đã được tạo và đang chờ quản lý duyệt.');
    window.setTimeout(() => router.push('/login'), 900);
  };

  return (
    <form className="login-form create-account-form" onSubmit={handleSubmit}>
      <div className="login-form-header">
        <div className="login-form-icon">
          <Store aria-hidden="true" size={26} />
        </div>
        <div>
          <h2>Tạo Tài Khoản</h2>
          <p>Đăng ký tài khoản nhân viên. Quản lý sẽ duyệt trước khi đăng nhập.</p>
        </div>
      </div>

      <label className="field-group">
        <span>Họ và Tên</span>
        <div className="text-field">
          <UserRound aria-hidden="true" size={20} />
          <input
            autoComplete="name"
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Nguyễn Minh Anh"
            required
            value={fullName}
          />
        </div>
      </label>

      <label className="field-group">
        <span>Email</span>
        <div className="text-field">
          <Mail aria-hidden="true" size={20} />
          <input
            autoComplete="email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@viepos.test"
            required
            type="email"
            value={email}
          />
        </div>
      </label>

      <label className="field-group">
        <span>Mật khẩu</span>
        <div className="text-field">
          <LockKeyhole aria-hidden="true" size={20} />
          <input
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Tối thiểu 8 ký tự"
            required
            type={showPassword ? 'text' : 'password'}
            value={password}
          />
          <button
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            className="field-icon-button"
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </label>

      <label className="field-group">
        <span>Nhập lại mật khẩu</span>
        <div className="text-field">
          <LockKeyhole aria-hidden="true" size={20} />
          <input
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Nhập lại mật khẩu"
            required
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
          />
        </div>
      </label>

      <div className="login-options create-account-options">
        <label>
          <input
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            type="checkbox"
          />
          <span>Tôi đồng ý điều khoản sử dụng ViePOS</span>
        </label>
      </div>

      {message ? (
        <p className={isSuccess ? 'create-account-success' : 'login-error'}>{message}</p>
      ) : null}

      <button className="login-submit" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'ĐANG TẠO...' : 'TẠO TÀI KHOẢN'}
      </button>

      <p className="auth-secondary-link">
        Đã có tài khoản? <a href="/login">Đăng nhập</a>
      </p>
    </form>
  );
}
