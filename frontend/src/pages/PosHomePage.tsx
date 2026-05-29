import { useState, useEffect, useMemo } from 'react';
import { Calendar, DollarSign, FileText, Package, X, User } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { orderAPI, unwrapOrdersList } from '../services/api';
import { getCachedOrderItems, mapCachedItemToDetailRow } from '../utils/orderItemsCache';
import api from '../services/api';
import { PIE_SERVICE_COLORS } from '../constants/serviceChartColors';
import { buildPaymentPieSlices, formatPaymentPieLine, paymentPieColorForLabel, withPaymentPieColors } from '../utils/paymentPieData';
import { renderPaymentPieLabel } from '../utils/paymentPieChartLabel';
import {
  applyFromDateChange,
  applyToDateChange,
  getTodayYmd,
  isValidDateRange,
} from '../utils/dateRangeFilter';
import { splitDateTimeVN } from '../utils/dateTime';
import CustomSelect from '../components/CustomSelect';
import './PosHomePage.css';

const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <g>
      <circle cx={x} cy={y} r={14} fill="white" stroke="#e0e0e0" strokeWidth={1} />
      <text x={x} y={y} fill="#306B0E" textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    </g>
  );
};

const fmt = (n: number) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
};

const SERVICE_TYPE_LABEL: Record<string, string> = {
  TAKEAWAY: 'Mang đi',
  FOUR_HOURS: '4H',
  FULL_DAY: 'Cả ngày',
  PACKAGE_4H: '4H',
  FULLTIME: 'Cả ngày',
};

export default function PosHomePage() {
  const [timeFilter, setTimeFilter] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const todayStr = getTodayYmd();

  // Lấy thông tin nhân viên hiện tại (private/cá nhân)
  const currentStaffId = localStorage.getItem('staffId') || '';
  const currentStaffName = localStorage.getItem('staffName') || 'Tôi';

  // Stats
  const [orders, setOrders] = useState<any[]>([]);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const startOfWeekMonday = (date: Date) => {
    const d = new Date(date);
    const dow = d.getDay();
    const diff = dow === 0 ? 6 : dow - 1;
    d.setDate(d.getDate() - diff);
    return d;
  };

  const activeRange = useMemo(() => {
    const now = new Date();
    if (timeFilter === 'custom') {
      return isValidDateRange(startDate, endDate)
        ? { fromDate: startDate, toDate: endDate }
        : null;
    }
    if (timeFilter === 'today') {
      return { fromDate: todayStr, toDate: todayStr };
    }
    if (timeFilter === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const ys = formatLocalDate(y);
      return { fromDate: ys, toDate: ys };
    }
    if (timeFilter === 'week') {
      return {
        fromDate: formatLocalDate(startOfWeekMonday(now)),
        toDate: todayStr,
      };
    }
    if (timeFilter === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { fromDate: formatLocalDate(first), toDate: todayStr };
    }
    return { fromDate: todayStr, toDate: todayStr };
  }, [timeFilter, startDate, endDate, todayStr]);

  useEffect(() => {
    if (!activeRange) return;

    let cancelled = false;
    const fetchAll = async () => {
      setIsLoading(true);
      setSelectedOrderId(null);
      setOrderDetail(null);
      try {
        // Lấy chỉ đơn của nhân viên hiện tại (private)
        const [ordersRes, prodRes] = await Promise.all([
          orderAPI.getOrders({
            ...activeRange,
            status: 'COMPLETED',
            page: 0,
            size: 200,
            ...(currentStaffId ? { employeeId: currentStaffId } : {}),
          }),
          api.get('/api/products'),
        ]);
        if (cancelled) return;
        const list = unwrapOrdersList(ordersRes.data);
        setOrders(list);
        setTotalProducts((prodRes.data || []).filter((p: any) => p.isActive).length);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setOrders([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [activeRange, currentStaffId]);

  useEffect(() => {
    if (!selectedOrderId) {
      setOrderDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsDetailLoading(true);
      try {
        const res = await orderAPI.getOrderById(selectedOrderId, { includeTransferProof: false });
        if (!cancelled) setOrderDetail(res.data);
      } catch (err) {
        console.error('Error fetching order detail:', err);
        if (!cancelled) setOrderDetail(null);
      } finally {
        if (!cancelled) setIsDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedOrderId]);

  const selectedOrder =
    orderDetail ||
    orders.find((o: any) => String(o.id) === String(selectedOrderId)) ||
    null;

  const detailItems: any[] = Array.isArray(orderDetail?.items) ? orderDetail.items : [];

  const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);

  // Tính stats từ danh sách đơn đã lọc (chỉ đơn của nhân viên này)
  const totalRevenue = orders.reduce((sum: number, o: any) => sum + num(o.totalAmount), 0);
  const totalOrders = orders.length;

  const countBySessionType = (keys: string[]) =>
    orders.filter((o: any) => keys.includes(String(o.sessionType || '').toUpperCase())).length;

  const fullDayCount = countBySessionType(['FULL_DAY', 'FULLTIME']);
  const fourHCount = countBySessionType(['FOUR_HOURS', 'PACKAGE_4H']);
  const takeawayCount = countBySessionType(['TAKEAWAY']);

  const typeData = [
    { name: 'Cả ngày', value: fullDayCount, color: PIE_SERVICE_COLORS.fullDay },
    { name: '4H', value: fourHCount, color: PIE_SERVICE_COLORS.fourHours },
    { name: 'Mang đi', value: takeawayCount, color: PIE_SERVICE_COLORS.takeaway },
  ];

  // Tính payment breakdown từ danh sách đơn
  const cashOrders = orders.filter((o: any) => (o.paymentMethod || '').toUpperCase() === 'CASH');
  const transferOrders = orders.filter((o: any) => (o.paymentMethod || '').toUpperCase() === 'BANK_TRANSFER');
  const cashAmount = cashOrders.reduce((s: number, o: any) => s + num(o.totalAmount), 0);
  const transferAmount = transferOrders.reduce((s: number, o: any) => s + num(o.totalAmount), 0);

  const syntheticStats = {
    totalRevenue,
    totalOrders,
    cashOrders: cashOrders.length,
    bankTransferOrders: transferOrders.length,
    cashAmount,
    bankTransferAmount: transferAmount,
    fullDayOrders: fullDayCount,
    package4hOrders: fourHCount,
    takeawayOrders: takeawayCount,
  };

  const paymentData =
    orders.length > 0
      ? withPaymentPieColors(
          buildPaymentPieSlices(syntheticStats, orders, { cashLabel: 'Tiền Mặt', transferLabel: 'Chuyển Khoản' })
        )
      : [];

  const hasTypeChart = typeData.some((d) => d.value > 0);
  const hasPaymentChart = paymentData.length > 0;

  const formatOrderTime = (isoStr: string) => splitDateTimeVN(isoStr);

  return (
    <div className="pos-home-container">
      <div className="pos-home-header-fixed">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 className="pos-home-title">Trang Chủ</h2>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: '#eef7e5', color: '#2d7a09', border: '1px solid #b5dca1',
            borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
          }}>
            <User size={11} />
            {currentStaffName}
          </span>
        </div>
        <div className="home-filter-container">
          <div className="time-filter-wrapper">
            <Calendar size={18} color="#3b9016" />
            <CustomSelect 
              value={timeFilter} 
              onChange={(val) => {
                setTimeFilter(val);
                if (val === 'custom') { setStartDate(todayStr); setEndDate(todayStr); }
              }} 
              className="time-filter-select"
              options={[
                { value: 'today', label: 'Hôm nay' },
                { value: 'yesterday', label: 'Hôm qua' },
                { value: 'week', label: 'Tuần này' },
                { value: 'month', label: 'Tháng này' },
                { value: 'custom', label: 'Tùy chỉnh khoảng ngày...' },
              ]}
            />
          </div>
          {timeFilter === 'custom' && (
            <div className="pos-custom-date-range">
              <div className="pos-date-input-wrapper">
                <span className="pos-date-label">Từ</span>
                <input
                  type="date"
                  value={startDate}
                  min="2000-01-01"
                  max={endDate > todayStr ? todayStr : endDate || todayStr}
                  onChange={(e) => {
                    const next = applyFromDateChange(e.target.value, endDate, todayStr);
                    setStartDate(next.from);
                    setEndDate(next.to);
                  }}
                  className="pos-date-input"
                  onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                />
              </div>
              <div className="pos-date-input-wrapper">
                <span className="pos-date-label">Đến</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  max={todayStr}
                  onChange={(e) => {
                    const next = applyToDateChange(e.target.value, startDate, todayStr);
                    setStartDate(next.from);
                    setEndDate(next.to);
                  }}
                  className="pos-date-input"
                  onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pos-home-content-scroll custom-scrollbar">
        {/* Summary Cards */}
        <div className="home-summary-cards">
          <div className="summary-card revenue">
            <div className="summary-card-top-border"></div>
            <div className="summary-icon-row">
              <div className="summary-icon-circle"><DollarSign size={10} strokeWidth={3} /></div>
              <div className="summary-title">Tổng Doanh Thu</div>
            </div>
            <div className="summary-value">{isLoading ? '--' : totalRevenue.toLocaleString('vi-VN') + 'đ'}</div>
            <div className="summary-badge-row"><span className="summary-compare-text">Kỳ đã chọn</span></div>
          </div>
          <div className="summary-card orders">
            <div className="summary-card-top-border"></div>
            <div className="summary-icon-row">
              <div className="summary-icon-circle"><FileText size={10} strokeWidth={3} /></div>
              <div className="summary-title">Tổng Đơn Hàng</div>
            </div>
            <div className="summary-value">{isLoading ? '--' : `${totalOrders} đơn`}</div>
            <div className="summary-badge-row"><span className="summary-compare-text">Kỳ đã chọn</span></div>
          </div>
          <div className="summary-card products">
            <div className="summary-card-top-border"></div>
            <div className="summary-icon-row">
              <div className="summary-icon-circle"><Package size={10} strokeWidth={3} /></div>
              <div className="summary-title">Tổng Sản Phẩm</div>
            </div>
            <div className="summary-value">{isLoading ? '--' : totalProducts}</div>
            <div className="summary-badge-row"><span className="summary-compare-text">Đang kinh doanh</span></div>
          </div>
        </div>

        {/* Chart 1 */}
        <div className="home-chart-card">
          <h3 className="chart-title">Cơ Cấu Theo Loại</h3>
          {isLoading ? (
            <p className="chart-empty-hint">Đang tải...</p>
          ) : !hasTypeChart ? (
            <p className="chart-empty-hint">Chưa có đơn hoàn tất trong kỳ này</p>
          ) : (
            <div className="chart-content-col">
              <div className="pos-type-chart-wrapper">
                <PieChart width={140} height={140}>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none" label={renderCustomizedLabel} labelLine={false}>
                    {typeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </div>
              <div className="chart-legend">
                {typeData.map((d, i) => (
                  <div key={i} className="legend-item">
                    <div className="legend-dot" style={{ backgroundColor: d.color }}></div>
                    <div className="legend-name">{d.name}</div>
                    <div className="legend-sub"> • {d.value} đơn</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chart 2 */}
        <div className="home-chart-card">
          <h3 className="chart-title">Cơ Cấu Theo Phương Thức Thanh Toán</h3>
          {isLoading ? (
            <p className="chart-empty-hint">Đang tải...</p>
          ) : !hasPaymentChart ? (
            <p className="chart-empty-hint">Chưa có dữ liệu thanh toán trong kỳ này</p>
          ) : (
            <div className="payment-chart-container">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" stroke="none" labelLine={false}
                    label={renderPaymentPieLabel}
                  >
                    {paymentData.map((e, i) => (
                      <Cell key={i} fill={paymentPieColorForLabel(e.name)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend payment-legend">
                {paymentData.map((d, i) => (
                  <div key={i} className="legend-item">
                    <div className="legend-dot" style={{ backgroundColor: paymentPieColorForLabel(d.name) }} />
                    <div className="legend-name">{d.name}</div>
                    <div className="legend-sub"> • {formatPaymentPieLine(d.orders, d.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Order List */}
        <div className="home-table-card">
          <div className="home-table-header">
            <h3 className="home-table-title">Danh Sách Đơn Hàng</h3>
            <div className="home-table-count">Kết quả: <span>{orders.length} đơn hàng</span></div>
          </div>
          <table className="home-table">
            <thead>
              <tr>
                <th className="home-th home-th-id">Mã Đơn</th>
                <th className="home-th home-th-time">Thời Gian</th>
                <th className="home-th home-th-amount">Tổng Tiền</th>
                <th className="home-th home-th-status">Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#888' }}>Đang tải...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#888' }}>Chưa có đơn hàng trong kỳ này</td></tr>
              ) : (
                orders.slice(0, 20).map((order: any, index: number) => {
                  const t = formatOrderTime(order.createdAt || order.completedAt);
                  return (
                    <tr
                      key={index}
                      onClick={() => {
                        const orderId = String(order.id);
                        const cached = getCachedOrderItems(order.orderCode);
                        setSelectedOrderId(orderId);
                        if (cached) {
                          setOrderDetail({
                            ...order,
                            items: cached.map((it) => mapCachedItemToDetailRow(it)),
                          });
                        } else {
                          setOrderDetail(null);
                        }
                      }}
                      className="clickable-row"
                    >
                      <td className="home-td home-td-id">{order.orderCode || order.id?.substring(0,8)}</td>
                      <td className="home-td home-td-time">
                        <div className="home-td-time-main">{t.date}</div>
                        <div className="home-td-time-sub">{t.time}</div>
                      </td>
                      <td className="home-td home-td-amount">{fmt(order.totalAmount || 0)}</td>
                      <td className="home-td home-td-status">
                        <span className="home-status-badge">Hoàn tất</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Order Detail Modal */}
        {selectedOrderId && selectedOrder && (
          <div className="pos-modal-overlay" onClick={() => { setSelectedOrderId(null); setOrderDetail(null); }}>
            <div className="pos-modal-content" onClick={e => e.stopPropagation()}>
              <div className="pos-modal-header">
                <h2 className="pos-modal-title">{selectedOrder.orderCode || selectedOrder.id?.substring(0,8)}</h2>
                <button className="pos-modal-close" onClick={() => { setSelectedOrderId(null); setOrderDetail(null); }}><X size={24} color="#111" /></button>
              </div>
              <div className="pos-modal-body">
                <div className="pos-modal-info-grid">
                  <div className="info-label">Ngày giờ:</div>
                  <div className="info-value">{formatOrderTime(selectedOrder.createdAt || selectedOrder.completedAt).full}</div>
                  <div className="info-label">Trạng thái:</div>
                  <div className="info-value"><span className="pos-modal-status-badge">Hoàn tất</span></div>
                  <div className="info-label">Thanh toán:</div>
                  <div className="info-value">{PAYMENT_LABEL[selectedOrder.paymentMethod] || selectedOrder.paymentMethod || '--'}</div>
                  <div className="info-label">Số thẻ:</div>
                  <div className="info-value">{selectedOrder.cardCode || selectedOrder.serviceCard || '--'}</div>
                </div>
                <div className="pos-modal-products-section">
                  <h3 className="pos-modal-products-title">Danh sách sản phẩm</h3>
                  <div className="pos-modal-products-table">
                    <div className="products-header-row">
                      <div className="col-name">SẢN PHẨM</div>
                      <div className="col-price">GIÁ</div>
                      <div className="col-qty">SL</div>
                      <div className="col-total">TỔNG</div>
                    </div>
                    <div className="products-list">
                      {isDetailLoading && detailItems.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#888' }}>Đang tải sản phẩm...</div>
                      ) : detailItems.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#888' }}>Không có sản phẩm trong đơn</div>
                      ) : (
                        detailItems.map((p: any, i: number) => {
                          const unitPrice = Number(p.unitPrice ?? p.price ?? 0);
                          const qty = Number(p.quantity ?? p.qty ?? 1);
                          const lineTotal = Number(p.lineTotal ?? unitPrice * qty);
                          return (
                            <div className="product-row" key={p.id ?? i}>
                              <div className="col-name">
                                <div className="p-name">{p.productName || p.name}</div>
                                <div className="p-type">{SERVICE_TYPE_LABEL[p.serviceType] || p.serviceType || p.type || ''}</div>
                              </div>
                              <div className="col-price">{fmt(unitPrice)}</div>
                              <div className="col-qty">{qty}</div>
                              <div className="col-total">{fmt(lineTotal)}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="pos-modal-footer">
                <div className="footer-label">Tổng cộng đơn</div>
                <div className="footer-amount">{fmt(selectedOrder.totalAmount || 0)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
