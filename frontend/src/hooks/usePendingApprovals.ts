import { useState, useEffect, useCallback } from 'react';
import { staffAPI } from '../services/api';
import { canAccessManagement } from '../utils/auth';

export type PendingApprovalCounts = {
  accounts: number;
  pins: number;
  resets: number;
  total: number;
};

const EMPTY: PendingApprovalCounts = { accounts: 0, pins: 0, resets: 0, total: 0 };

export const PENDING_APPROVALS_CHANGED = 'pending-approvals-changed';

export function notifyPendingApprovalsChanged() {
  window.dispatchEvent(new CustomEvent(PENDING_APPROVALS_CHANGED));
}

export function usePendingApprovals(pollMs = 60_000) {
  const [counts, setCounts] = useState<PendingApprovalCounts>(EMPTY);

  const refresh = useCallback(async () => {
    if (!canAccessManagement()) {
      setCounts(EMPTY);
      return;
    }
    try {
      const [accountsRes, pinsRes, resetsRes] = await Promise.all([
        staffAPI.getPending(),
        staffAPI.getPendingPinRequests(),
        staffAPI.getPendingPinResets(),
      ]);
      const accounts = accountsRes.data?.length ?? 0;
      const pins = pinsRes.data?.length ?? 0;
      const resets = resetsRes.data?.length ?? 0;
      setCounts({ accounts, pins, resets, total: accounts + pins + resets });
    } catch {
      /* ignore — badge ẩn khi lỗi mạng */
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollMs);
    const onChanged = () => refresh();
    window.addEventListener(PENDING_APPROVALS_CHANGED, onChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener(PENDING_APPROVALS_CHANGED, onChanged);
    };
  }, [refresh, pollMs]);

  return { counts, refresh };
}
