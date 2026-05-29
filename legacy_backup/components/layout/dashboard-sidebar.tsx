import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { DashboardNavigationItem } from './dashboard-navigation-items';

interface DashboardSidebarProps {
  items: DashboardNavigationItem[];
  currentPath: string;
  isDrawerOpen: boolean;
  isMobileDrawer: boolean;
  onClose: () => void;
}

const isItemCurrent = (item: DashboardNavigationItem, currentPath: string): boolean =>
  currentPath === item.href;

const isItemActive = (item: DashboardNavigationItem, currentPath: string): boolean => {
  if (item.href === '/dashboard') {
    return isItemCurrent(item, currentPath);
  }

  return isItemCurrent(item, currentPath) || currentPath.startsWith(`${item.href}/`);
};

const renderNavItem = (
  item: DashboardNavigationItem,
  currentPath: string,
  onClose: () => void
) => {
  const Icon = item.icon;
  const active = isItemActive(item, currentPath);
  const current = isItemCurrent(item, currentPath);

  return (
    <div className="dashboard-nav-group" key={item.id}>
      <Link
        aria-current={current ? 'page' : undefined}
        className={active ? 'dashboard-nav-link is-active' : 'dashboard-nav-link'}
        href={item.href}
        onClick={onClose}
      >
        <Icon aria-hidden="true" />
        <span>{item.label}</span>
        {item.children ? <ChevronRight aria-hidden="true" className="dashboard-nav-chevron" /> : null}
      </Link>
      {item.children ? (
        <div className="dashboard-nav-children">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            const childActive = isItemActive(child, currentPath);
            const current = isItemCurrent(child, currentPath);

            return (
              <Link
                aria-current={current ? 'page' : undefined}
                className={childActive ? 'dashboard-nav-child is-active' : 'dashboard-nav-child'}
                href={child.href}
                key={child.id}
                onClick={onClose}
              >
                <ChildIcon aria-hidden="true" />
                <span>{child.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export function DashboardSidebar({
  items,
  currentPath,
  isDrawerOpen,
  isMobileDrawer,
  onClose,
}: DashboardSidebarProps) {
  const settingsItem = items.find((item) => item.id === 'settings');
  const primaryItems = items.filter((item) => item.id !== 'settings');
  const SettingsIcon = settingsItem?.icon;
  const hideMobileDrawer = isMobileDrawer && !isDrawerOpen;

  return (
    <aside
      aria-hidden={hideMobileDrawer}
      className={isDrawerOpen ? 'dashboard-sidebar is-open' : 'dashboard-sidebar'}
      id="dashboard-sidebar"
      inert={hideMobileDrawer}
    >
      <div className="dashboard-sidebar-brand">
        <Image alt="ViePOS" height={30} priority src="/images/logo-white.svg" width={100} />
      </div>

      <nav aria-label="Dashboard modules" className="dashboard-sidebar-nav">
        {primaryItems.map((item) => renderNavItem(item, currentPath, onClose))}
      </nav>

      {settingsItem && SettingsIcon ? (
        <Link
          aria-current={isItemCurrent(settingsItem, currentPath) ? 'page' : undefined}
          className="dashboard-settings-link"
          href={settingsItem.href}
          onClick={onClose}
        >
          <SettingsIcon aria-hidden="true" />
          <span>{settingsItem.label}</span>
        </Link>
      ) : null}
    </aside>
  );
}
