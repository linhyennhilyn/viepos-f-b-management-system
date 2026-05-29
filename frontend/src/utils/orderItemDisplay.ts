/** Chỉ món tại chỗ gói 4 giờ được highlight (#F0F8EC). */

export const PACKAGE_4H_ROW_BG = '#F0F8EC';
export const DEFAULT_ROW_BG = '#ffffff';

export function isItemPackage4h(item: {
  serveType?: string;
  duration?: string;
  serviceType?: string;
}): boolean {
  const serveType = item.serveType;
  const duration = item.duration;
  const serviceType = item.serviceType;

  if (serveType === 'takeaway') return false;
  if (duration === 'all_day') return false;
  if (serviceType === 'FULL_DAY' || serviceType === 'FULLTIME') return false;

  if (duration === '4h') return serveType === 'dine_in' || serveType == null;
  if (serviceType === 'FOUR_HOURS' || serviceType === 'PACKAGE_4H') return true;

  return serveType === 'dine_in' && duration === '4h';
}

export function rowBackground(is4h: boolean): string {
  return is4h ? PACKAGE_4H_ROW_BG : DEFAULT_ROW_BG;
}
