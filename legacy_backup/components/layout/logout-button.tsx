'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async (): Promise<void> => {
    await fetch('/api/app-auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  };

  return (
    <button className="dashboard-logout" onClick={handleLogout} type="button">
      Đăng xuất
    </button>
  );
}
