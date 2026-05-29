import { PIE_PAYMENT_COLORS } from '../constants/serviceChartColors';

export type PaymentPieSlice = {
  name: string;
  orders: number;
  amount: number;
  /** Kích thước lát pie — theo số tiền */
  value: number;
  color: string;
};

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);

export const formatPaymentPieLine = (orders: number, amount: number) =>
  `${orders} đơn | ${new Intl.NumberFormat('vi-VN').format(amount)}đ`;

export function buildPaymentPieSlices(
  stats: Record<string, unknown> | null | undefined,
  orders: Array<{ status?: string; paymentMethod?: string; paymentAmount?: unknown; totalAmount?: unknown }>,
  options?: { cashLabel?: string; transferLabel?: string }
): PaymentPieSlice[] {
  const cashLabel = options?.cashLabel ?? 'Tiền mặt';
  const transferLabel = options?.transferLabel ?? 'Chuyển khoản';

  let cashCount = num(stats?.cashOrderCount);
  let transferCount = num(stats?.transferOrderCount);
  let cashAmount = num(stats?.cashAmount);
  let transferAmount = num(stats?.transferAmount);

  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');

  if ((cashCount + transferCount === 0 || cashAmount + transferAmount === 0) && completedOrders.length > 0) {
    cashCount = 0;
    transferCount = 0;
    cashAmount = 0;
    transferAmount = 0;
    completedOrders.forEach((o) => {
      const amt = num(o.paymentAmount) || num(o.totalAmount);
      if (o.paymentMethod === 'BANK_TRANSFER') {
        transferCount += 1;
        transferAmount += amt;
      } else {
        cashCount += 1;
        cashAmount += amt;
      }
    });
  }

  const slices: PaymentPieSlice[] = [];
  if (cashCount > 0 || cashAmount > 0) {
    slices.push({
      name: cashLabel,
      orders: cashCount,
      amount: cashAmount,
      value: cashAmount > 0 ? cashAmount : cashCount,
      color: PIE_PAYMENT_COLORS.cash,
    });
  }
  if (transferCount > 0 || transferAmount > 0) {
    slices.push({
      name: transferLabel,
      orders: transferCount,
      amount: transferAmount,
      value: transferAmount > 0 ? transferAmount : transferCount,
      color: PIE_PAYMENT_COLORS.transfer,
    });
  }
  return slices;
}

export function isTransferPaymentLabel(name: string) {
  return /chuyển|chuyen|transfer/i.test(name);
}

export function paymentPieColorForLabel(name: string) {
  return isTransferPaymentLabel(name) ? PIE_PAYMENT_COLORS.transfer : PIE_PAYMENT_COLORS.cash;
}

/** Gán lại màu chuẩn (#5FC63E / #256E05) sau khi build slices */
export function withPaymentPieColors(slices: PaymentPieSlice[]): PaymentPieSlice[] {
  return slices.map((s) => ({ ...s, color: paymentPieColorForLabel(s.name) }));
}
