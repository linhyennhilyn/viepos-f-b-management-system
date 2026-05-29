const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VN_OFFSET = '+07:00';

/** Chuỗi ISO đã có múi giờ (Z hoặc +07:00). */
function hasTimezoneSuffix(s: string): boolean {
  return /[Zz]$|[+-]\d{2}:?\d{2}$/.test(s);
}

/**
 * Parse datetime từ bảng ORDERS (created_at, completed_at).
 * Backend Spring Boot trên Render chạy múi giờ UTC.
 * Chuỗi naive (không có suffix) = UTC → gắn 'Z'.
 * Chuỗi đã có offset/Z → parse trực tiếp.
 */
export function parseApiDateTime(value: string | null | undefined): Date {
  if (!value) return new Date(NaN);
  const s = value.trim();
  if (!s) return new Date(NaN);
  if (hasTimezoneSuffix(s)) {
    return new Date(s);
  }
  const iso = s.includes('T') ? s : `${s}T00:00:00`;
  // Naive string từ bảng orders = UTC (server Render chạy UTC)
  return new Date(`${iso}Z`);
}

/**
 * Parse datetime từ bảng SERVICE_CARDS (startedAt, expectedEndAt).
 * Backend lưu giờ tường Việt Nam (VN wall-clock, UTC+7) vào các cột này.
 * Chuỗi naive (không có suffix) = +07:00.
 * Chuỗi đã có offset/Z → parse trực tiếp.
 */
export function parseVNWallDateTime(value: string | null | undefined): Date {
  if (!value) return new Date(NaN);
  const s = value.trim();
  if (!s) return new Date(NaN);
  if (hasTimezoneSuffix(s)) {
    return new Date(s);
  }
  const iso = s.includes('T') ? s : `${s}T00:00:00`;
  // Naive string từ service_cards = giờ VN wall-clock
  return new Date(`${iso}${VN_OFFSET}`);
}

/** Format datetime for UI in Vietnam (GMT+7). */
export function formatDateTimeVN(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseApiDateTime(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString('vi-VN', {
    timeZone: VN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  });
}

/** Tách ngày và giờ (GMT+7) — dùng cho bảng đơn hàng, chi tiết đơn. */
export function splitDateTimeVN(value: string | null | undefined): {
  date: string;
  time: string;
  full: string;
} {
  const d = parseApiDateTime(value);
  if (Number.isNaN(d.getTime())) {
    return { date: '--', time: '--', full: '--' };
  }
  const date = d.toLocaleDateString('vi-VN', {
    timeZone: VN_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('vi-VN', {
    timeZone: VN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return { date, time, full: `${time} - ${date}` };
}

/** Giờ:phút (GMT+7) — dùng cho thẻ bàn "Vào lúc …" (startedAt từ service_cards). */
export function formatTimeVN(value: string | null | undefined): string {
  // Session times (service_cards) lưu giờ VN wall-clock → dùng parseVNWallDateTime
  const d = parseVNWallDateTime(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleTimeString('vi-VN', {
    timeZone: VN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
}
