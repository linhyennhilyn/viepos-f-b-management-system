/** Đọc món đơn từ localStorage (POS lưu khi bán) — hiển thị tức thì như chi tiết thẻ. */

export function getCachedOrderItems(orderCode: string | undefined | null): any[] | null {
  if (!orderCode) return null;
  try {
    const raw = localStorage.getItem('pos_orders_metadata');
    const meta = raw ? JSON.parse(raw) : {};
    const items = meta[orderCode]?.items;
    return Array.isArray(items) && items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

export function mapCachedItemToDetailRow(it: Record<string, unknown>) {
  const serveType = String(it.serveType ?? '');
  const duration = String(it.duration ?? '');
  let serviceType = 'TAKEAWAY';
  if (serveType === 'dine_in') {
    serviceType = duration === '4h' ? 'FOUR_HOURS' : 'FULL_DAY';
  }
  const unitPrice = Number(it.price ?? it.unitPrice ?? 0);
  const quantity = Number(it.quantity ?? it.qty ?? 1);
  return {
    productName: String(it.name ?? it.productName ?? ''),
    serviceType,
    unitPrice,
    quantity,
    lineTotal: Number(it.lineTotal ?? unitPrice * quantity),
  };
}
