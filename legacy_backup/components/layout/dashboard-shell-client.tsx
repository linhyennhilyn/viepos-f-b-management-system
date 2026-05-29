'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { AppUserProfilePolicy } from '@/lib/auth/auth-roles';
import { DashboardSidebar } from './dashboard-sidebar';
import { getDashboardNavigationItems } from './dashboard-navigation-items';
import { DashboardTopbar } from './dashboard-topbar';

interface DashboardShellClientProps {
  user: AppUserProfilePolicy & { email: string; name: string };
  children: React.ReactNode;
}

export function DashboardShellClient({ user, children }: DashboardShellClientProps) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileDrawer, setIsMobileDrawer] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigationItems = getDashboardNavigationItems(user);
  const hideShellBehindDrawer = isMobileDrawer && isDrawerOpen;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const syncMobileDrawer = () => setIsMobileDrawer(media.matches);

    syncMobileDrawer();
    media.addEventListener('change', syncMobileDrawer);

    return () => media.removeEventListener('change', syncMobileDrawer);
  }, []);

  const closeDrawer = () => {
    setIsDrawerOpen(false);

    if (isMobileDrawer) {
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  };

  return (
    <div className="dashboard-shell">
      <DashboardSidebar
        currentPath={pathname}
        isDrawerOpen={isDrawerOpen}
        isMobileDrawer={isMobileDrawer}
        items={navigationItems}
        onClose={closeDrawer}
      />
      {isDrawerOpen ? (
        <button
          aria-label="Đóng menu"
          className="dashboard-drawer-backdrop"
          onClick={closeDrawer}
          type="button"
        />
      ) : null}

      <DashboardTopbar
        hideFromAssistiveTech={hideShellBehindDrawer}
        isDrawerOpen={isDrawerOpen}
        menuButtonRef={menuButtonRef}
        onMenuClick={() => setIsDrawerOpen((current) => !current)}
        user={user}
      />

      <main aria-hidden={hideShellBehindDrawer} className="dashboard-main" inert={hideShellBehindDrawer}>
        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  );
}
