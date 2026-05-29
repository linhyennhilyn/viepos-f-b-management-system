'use client';

import { Eye, EyeOff, LockKeyhole, Mail, Store } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import './login-form.css';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('nguyennlt.ncc@gmail.com');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const response = await fetch('/api/app-auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe: rememberDevice }),
    });
    const result = (await response.json()) as { ok: boolean; message?: string; redirectTo?: string };

    if (!response.ok || !result.ok) {
      setErrorMessage(result.message ?? 'Không thể đăng nhập.');
      setIsSubmitting(false);
      return;
    }

    router.push(result.redirectTo ?? '/dashboard');
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="login-form-header">
        <div className="login-form-icon">
          <Store aria-hidden="true" size={26} />
        </div>
        <div>
          <h2>Đăng Nhập</h2>
          <p>Dùng email và mật khẩu để vào hệ thống ViePOS.</p>
        </div>
      </div>

      <label className="field-group">
        <span>Email</span>
        <div className="text-field">
          <Mail aria-hidden="true" size={20} />
          <input
            autoComplete="email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="manager@test.com"
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
            autoComplete="current-password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nhập mật khẩu"
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

      <div className="login-options">
        <label>
          <input
            checked={rememberDevice}
            onChange={(event) => setRememberDevice(event.target.checked)}
            type="checkbox"
          />
          <span>Ghi nhớ phiên đăng nhập</span>
        </label>
        <a href="/forgot-password">Quên mật khẩu?</a>
      </div>

      {errorMessage ? <p className="login-error">{errorMessage}</p> : null}

      <button className="login-submit" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
      </button>

      <p className="auth-secondary-link">
        Chưa có tài khoản? <a href="/create-account">Tạo tài khoản</a>
      </p>
    </form>
  );
}
