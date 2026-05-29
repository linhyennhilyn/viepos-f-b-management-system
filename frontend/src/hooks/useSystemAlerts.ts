import { useState, useEffect, useCallback } from 'react';
import { productAPI, cardAPI } from '../services/api';
import { getTableCardDisplay } from '../utils/tableSessionDisplay';
import { canAccessManagement } from '../utils/auth';

export type SystemAlertCounts = {
  lowStock: number;
  outOfStock: number;
  idleTables: number; // For Tables that are overdue or near overdue
  total: number;
};

const EMPTY: SystemAlertCounts = { lowStock: 0, outOfStock: 0, idleTables: 0, total: 0 };

export function useSystemAlerts(pollMs = 60_000) {
  const [counts, setCounts] = useState<SystemAlertCounts>(EMPTY);

  const refresh = useCallback(async () => {
    if (!canAccessManagement()) {
      setCounts(EMPTY);
      return;
    }
    try {
      const [productsRes, sessionsRes] = await Promise.all([
        productAPI.getProducts().catch(() => ({ data: [] })),
        cardAPI.getSessions().catch(() => ({ data: [] }))
      ]);
      
      const products = productsRes.data || [];
      const sessions = sessionsRes.data || [];

      let outOfStock = 0;
      let lowStock = 0;

      for (const p of products) {
        if (!p.isActive) continue;
        if (p.currentStock <= 0) {
          outOfStock++;
        } else if (p.currentStock <= (p.minimumStock || 0)) {
          lowStock++;
        }
      }

      let idleTables = 0;
      const now = new Date();
      for (const s of sessions) {
        if (s.status === 'ACTIVE' && !s.actualEndTime && !s.actualEndAt) {
           const startTime = s.startedAt || s.startTime;
           const endTime = s.expectedEndAt || s.endTime;
           
           if (!startTime || !endTime) continue;

           const display = getTableCardDisplay({ 
             startTime, 
             endTime,
             serviceType: s.serviceType
           }, now);
           
           if (display.isOverdue || display.isNearOverdue) {
             idleTables++;
           }
        }
      }

      setCounts({
        lowStock,
        outOfStock,
        idleTables,
        total: lowStock + outOfStock + idleTables
      });

    } catch (err) {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollMs);
    return () => clearInterval(interval);
  }, [refresh, pollMs]);

  return { alerts: counts, refreshAlerts: refresh };
}
