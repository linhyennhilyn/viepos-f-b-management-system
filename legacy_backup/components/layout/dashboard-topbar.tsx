import Image from 'next/image';
import { Bell, ChevronDown, CircleHelp, Menu, Search, Star } from 'lucide-react';
import type { RefObject } from 'react';
import type { AppUserProfilePolicy } from '@/lib/auth/auth-roles';
import { LogoutButton } from './logout-button';

interface DashboardTopbarProps {
  user: AppUserProfilePolicy & { email: string; name: string };
  hideFromAssistiveTech: boolean;
  isDrawerOpen: boolean;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  onMenuClick: () => void;
}

const roleLabel = {
  ROOT_ADMIN: 'Root admin',
  ADMIN: 'Quản lý',
  STAFF: 'Nhân viên',
} as const;

export function DashboardTopbar({
  user,
  hideFromAssistiveTech,
  isDrawerOpen,
  menuButtonRef,
  onMenuClick,
}: DashboardTopbarProps) {
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header aria-hidden={hideFromAssistiveTech} className="dashboard-topbar" inert={hideFromAssistiveTech}>
      <div className="dashboard-topbar-left">
        <button
          aria-controls="dashboard-sidebar"
          aria-expanded={isDrawerOpen}
          aria-label="Mở menu"
          className="dashboard-icon-button dashboard-menu-button"
          onClick={onMenuClick}
          ref={menuButtonRef}
          type="button"
        >
          <Menu aria-hidden="true" />
        </button>
        <Image alt="ViePOS" className="dashboard-topbar-logo" height={30} src="/images/logo.svg" width={100} />
        <label className="dashboard-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Tìm kiếm</span>
          <input placeholder="Tìm kiếm" type="search" />
        </label>
      </div>

      <div className="dashboard-topbar-right">
        <button aria-label="Trợ giúp" className="dashboard-icon-button" type="button">
          <CircleHelp aria-hidden="true" />
        </button>
        <button aria-label="Yêu thích" className="dashboard-icon-button" type="button">
          <Star aria-hidden="true" />
        </button>
        <button aria-label="Thông báo" className="dashboard-icon-button" type="button">
          <Bell aria-hidden="true" />
        </button>
        <div className="dashboard-user-menu">
          <span className="dashboard-user-avatar">{initials || 'VP'}</span>
          <span className="dashboard-user-copy">
            <strong>{user.name}</strong>
            <small>{roleLabel[user.role]}</small>
          </span>
          <ChevronDown aria-hidden="true" />
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
