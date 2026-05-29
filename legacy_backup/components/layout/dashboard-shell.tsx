import type { AppUserProfilePolicy } from '@/lib/auth/auth-roles';
import { DashboardShellClient } from './dashboard-shell-client';
import '@/app/dashboard.css';

interface DashboardShellProps {
  user: AppUserProfilePolicy & { email: string; name: string };
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  return <DashboardShellClient user={user}>{children}</DashboardShellClient>;
}
