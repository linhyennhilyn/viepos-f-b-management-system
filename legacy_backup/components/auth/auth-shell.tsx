import { BadgeCheck, Coffee, ReceiptText } from 'lucide-react';
import './auth-shell.css';

interface AuthShellProps {
  children: React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="auth-shell">
      <section className="auth-hero" aria-label="Giới thiệu ViePOS">
        <div className="auth-brand">
          <div className="auth-brand-mark">
            <ReceiptText aria-hidden="true" size={34} strokeWidth={2.2} />
          </div>
          <span>ViePOS</span>
        </div>

        <div className="auth-hero-content">
          <p className="auth-kicker">Vừa - Đủ - Tinh Gọn</p>
          <h1>Từ bán hàng đến vận hành trong một hệ thống</h1>
          <p>
            Đăng nhập nhanh cho quầy thu ngân, phân quyền rõ cho quản lý và nhân viên.
          </p>
        </div>

        <div className="auth-hero-strip" aria-hidden="true">
          <div>
            <Coffee size={20} />
            <span>Quán cà phê</span>
          </div>
          <div>
            <BadgeCheck size={20} />
            <span>Nhớ thiết bị 7 ngày</span>
          </div>
        </div>
      </section>

      <section className="auth-panel" aria-label="Đăng nhập ViePOS">
        {children}
      </section>
    </main>
  );
}
