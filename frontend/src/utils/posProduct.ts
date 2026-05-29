/** Sản phẩm POS — giá lấy từ API /api/products (Spring → Supabase). */

export interface PosProduct {
  id: string;
  sku: string;
  name: string;
  imageUrl: string | null;
  isActive: boolean;
  categoryName: string;
  categoryId?: string;
  priceTakeaway: number;
  pricePackage4h: number;
  pricePackageFullday: number;
  isCustomPrice?: boolean;
  currentStock: number;
}

export function parseApiNumber(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number(String(value).replace(/\./g, '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Map response GET /api/products → object dùng trong POS. */
export function mapPosProduct(raw: Record<string, unknown>): PosProduct {
  return {
    id: String(raw.id ?? ''),
    sku: String(raw.sku ?? ''),
    name: String(raw.name ?? ''),
    imageUrl: (raw.imageUrl as string | null) ?? null,
    isActive: raw.isActive !== false,
    categoryName: String(raw.categoryName ?? (raw.category as { name?: string } | undefined)?.name ?? 'Chưa phân loại'),
    categoryId: raw.categoryId != null ? String(raw.categoryId) : undefined,
    priceTakeaway: parseApiNumber(raw.priceTakeaway),
    pricePackage4h: parseApiNumber(raw.pricePackage4h),
    pricePackageFullday: parseApiNumber(raw.pricePackageFullday),
    isCustomPrice: Boolean(raw.isCustomPrice),
    currentStock: parseApiNumber(raw.currentStock),
  };
}

export function posUnitPrice(
  product: Pick<PosProduct, 'priceTakeaway' | 'pricePackage4h' | 'pricePackageFullday'>,
  serveType: 'takeaway' | 'dine_in',
  duration: '4h' | 'all_day',
): number {
  if (serveType === 'takeaway') return product.priceTakeaway;
  if (duration === '4h') return product.pricePackage4h;
  return product.pricePackageFullday;
}
