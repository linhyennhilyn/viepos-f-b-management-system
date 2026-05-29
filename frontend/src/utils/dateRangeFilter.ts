/** Ngày local YYYY-MM-DD (tránh lệch UTC của toISOString). */
export function getTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function clampToToday(dateStr: string, today = getTodayYmd()): string {
  if (!dateStr) return today;
  return dateStr > today ? today : dateStr;
}

export function isValidDateRange(from: string, to: string): boolean {
  return Boolean(from && to && from <= to);
}

/** Đổi ngày "Từ" — tự chỉnh "Đến" nếu cần. */
export function applyFromDateChange(
  newFrom: string,
  currentTo: string,
  today = getTodayYmd()
): { from: string; to: string } {
  const from = clampToToday(newFrom || today, today);
  let to = currentTo ? clampToToday(currentTo, today) : today;
  if (from > to) to = from;
  return { from, to };
}

/** Đổi ngày "Đến" — tự chỉnh "Từ" nếu cần. */
export function applyToDateChange(
  newTo: string,
  currentFrom: string,
  today = getTodayYmd()
): { from: string; to: string } {
  const to = clampToToday(newTo || today, today);
  let from = currentFrom ? clampToToday(currentFrom, today) : today;
  if (from > to) from = to;
  return { from, to };
}
