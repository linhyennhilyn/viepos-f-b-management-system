import { parseVNWallDateTime } from './dateTime';

export type TableDurationType = '4h' | 'all_day';

export interface TableSessionLike {
  startTime: string;
  endTime: string;
  serviceType?: string | null;
}

export type TableCardStatusColor = 'overdue' | 'near-overdue' | 'in-use' | 'free' | 'locked';

export interface TableCardDisplay {
  durationType: TableDurationType | null;
  statusColor: TableCardStatusColor;
  badgeText: string;
  timerStr: string;
  isOverdue: boolean;
  isNearOverdue: boolean;
  remainingTimeMs: number;
}

const FOUR_HOUR_MS = 60 * 60 * 1000;
const NEAR_OVERDUE_MS = 15 * 60 * 1000;

const FOUR_HOUR_SLOT_HOURS = [4, 8, 12, 16, 20, 24];

function isPackage4hServiceType(serviceType: string | null | undefined): boolean {
  const st = (serviceType ?? '').toUpperCase();
  return st === 'PACKAGE_4H' || st === 'FOUR_HOURS';
}

function isFullDayServiceType(serviceType: string | null | undefined): boolean {
  const st = (serviceType ?? '').toUpperCase();
  return st === 'FULLTIME' || st === 'FULL_DAY';
}

/** Ưu tiên serviceType từ backend; fallback theo khoảng start–end. */
export function resolveSessionDurationType(session: TableSessionLike): TableDurationType {
  if (isPackage4hServiceType(session.serviceType)) return '4h';
  if (isFullDayServiceType(session.serviceType)) return 'all_day';

  const start = parseVNWallDateTime(session.startTime);
  const end = parseVNWallDateTime(session.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'all_day';

  const diffMs = end.getTime() - start.getTime();
  const is4hSlot = FOUR_HOUR_SLOT_HOURS.some(
    (h) => Math.abs(diffMs - h * FOUR_HOUR_MS) < 60_000,
  );
  return is4hSlot ? '4h' : 'all_day';
}

function formatCountdown(ms: number, negative = false): string {
  const abs = Math.abs(ms);
  const hours = Math.floor(abs / FOUR_HOUR_MS);
  const mins = Math.floor((abs % FOUR_HOUR_MS) / (60 * 1000));
  const secs = Math.floor((abs % (60 * 1000)) / 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const body = `${pad(hours)} : ${pad(mins)} : ${pad(secs)}`;
  return negative ? `-${body}` : body;
}

/** Trạng thái hiển thị thẻ bàn — dùng chung POS Bàn và quản lý Bàn. */
export function getTableCardDisplay(
  session: TableSessionLike,
  now: Date = new Date(),
): TableCardDisplay {
  const durationType = resolveSessionDurationType(session);
  const end = parseVNWallDateTime(session.endTime);
  const remainingTimeMs = Number.isNaN(end.getTime())
    ? Number.POSITIVE_INFINITY
    : end.getTime() - now.getTime();

  if (durationType === 'all_day') {
    return {
      durationType: 'all_day',
      statusColor: 'in-use',
      badgeText: 'Cả ngày',
      timerStr: 'CẢ NGÀY',
      isOverdue: false,
      isNearOverdue: false,
      // Cả ngày không countdown — xếp sau các bàn 4H khi sort theo thời gian còn lại
      remainingTimeMs: Number.POSITIVE_INFINITY,
    };
  }

  const isOverdue = remainingTimeMs < 0;
  const isNearOverdue = !isOverdue && remainingTimeMs <= NEAR_OVERDUE_MS;

  if (isOverdue) {
    return {
      durationType: '4h',
      statusColor: 'overdue',
      badgeText: 'Quá giờ',
      timerStr: formatCountdown(remainingTimeMs, true),
      isOverdue: true,
      isNearOverdue: false,
      remainingTimeMs,
    };
  }

  if (isNearOverdue) {
    return {
      durationType: '4h',
      statusColor: 'near-overdue',
      badgeText: 'Sắp hết giờ',
      timerStr: formatCountdown(remainingTimeMs),
      isOverdue: false,
      isNearOverdue: true,
      remainingTimeMs,
    };
  }

  return {
    durationType: '4h',
    statusColor: 'in-use',
    badgeText: '4H',
    timerStr: formatCountdown(remainingTimeMs),
    isOverdue: false,
    isNearOverdue: false,
    remainingTimeMs,
  };
}

export function getActiveSessionForCard<
  T extends TableSessionLike & { card: { cardNumber: string }; status: string; actualEndTime: string | null },
>(sessions: T[], cardNumber: string): T | undefined {
  return sessions.find(
    (s) =>
      s.card.cardNumber === cardNumber &&
      s.status !== 'Hoàn thành' &&
      !s.actualEndTime,
  );
}
