import type { LucideIcon } from 'lucide-react';
import {
  ClipboardList,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
} from 'lucide-react';
import type { AppUserProfilePolicy } from '@/lib/auth/auth-roles';
import { getVisibleDashboardModules, type DashboardModule } from '@/lib/auth/permissions';

export interface DashboardNavigationItem {
  id: DashboardModule | 'overview';
  label: string;
  href: string;
  icon: LucideIcon;
  children?: DashboardNavigationItem[];
}

type DashboardNavigationUser = Pick<AppUserProfilePolicy, 'role' | 'status'>;

const MODULE_NAVIGATION: Record<DashboardModule, Omit<DashboardNavigationItem, 'id'>> = {
  sales: { label: 'Bán hàng', href: '/dashboard/sales', icon: ShoppingCart },
  orders: { label: 'Đơn hàng', href: '/dashboard/orders', icon: ClipboardList },
  menu: { label: 'Menu', href: '/dashboard/menu', icon: Store },
  staff: { label: 'Nhân viên', href: '/dashboard/staff', icon: Users },
  'staff-approvals': {
    label: 'Duyệt tài khoản',
    href: '/dashboard/staff/approvals',
    icon: ShieldCheck,
  },
  'staff-roles': { label: 'Phân quyền', href: '/dashboard/staff/roles', icon: ShieldCheck },
  settings: { label: 'Cài đặt', href: '/dashboard/settings', icon: Settings },
};

export const DASHBOARD_NAVIGATION_GROUPS: DashboardModule[][] = [
  ['sales', 'orders', 'menu'],
  ['staff', 'staff-approvals', 'staff-roles'],
  ['settings'],
];

const toNavigationItem = (module: DashboardModule): DashboardNavigationItem => ({
  id: module,
  ...MODULE_NAVIGATION[module],
});

export const getDashboardNavigationItems = (
  user: DashboardNavigationUser
): DashboardNavigationItem[] => {
  const visibleModules = getVisibleDashboardModules(user);
  const visible = new Set<DashboardModule>(visibleModules);
  const items: DashboardNavigationItem[] = [
    { id: 'overview', label: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  ];

  for (const group of DASHBOARD_NAVIGATION_GROUPS) {
    for (const dashboardModule of group) {
      if (!visible.has(dashboardModule) || dashboardModule.startsWith('staff-')) {
        continue;
      }

      const item = toNavigationItem(dashboardModule);
      if (dashboardModule === 'staff') {
        const children = (['staff-approvals', 'staff-roles'] as DashboardModule[])
          .filter((child) => visible.has(child))
          .map(toNavigationItem);

        items.push(children.length > 0 ? { ...item, children } : item);
      } else {
        items.push(item);
      }
    }
  }

  return items;
};
