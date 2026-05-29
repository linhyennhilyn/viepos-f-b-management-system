import { useState, useEffect, useCallback } from "react";
import { ArrowDownUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { orderAPI, unwrapOrdersList } from "../services/api";
import { PIE_SERVICE_TYPE_COLORS } from "../constants/serviceChartColors";
import {
  buildPaymentPieSlices,
  formatPaymentPieLine,
  paymentPieColorForLabel,
  withPaymentPieColors,
} from "../utils/paymentPieData";
import {
  applyFromDateChange,
  applyToDateChange,
  clampToToday,
  getTodayYmd,
  isValidDateRange,
} from "../utils/dateRangeFilter";
import { renderPaymentPieLabel } from "../utils/paymentPieChartLabel";
import iconSale from "../../assets/icon/sale_darkgreen.png";
import iconOrder from "../../assets/icon/order_red.png";
import iconAverage from "../../assets/icon/average_darkgreen.png";
import iconProduct from "../../assets/icon/total_product_darkgreen.png";
import "./RevenueReportPage.css";

const SESSION_TYPE_LABEL: Record<string, string> = {
  PACKAGE_4H: "4H",
  FULLTIME: "Cả ngày",
  TAKEAWAY: "Mang đi",
  FOUR_HOURS: "4H",
  FULL_DAY: "Cả ngày",
};

const TYPE_COLORS = PIE_SERVICE_TYPE_COLORS;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const displayTitle = data.tooltipLabel || label;
    return (
      <div className="chart-tooltip">
        <p className="tooltip-title">{displayTitle}</p>
        <p className="tooltip-value">
          {new Intl.NumberFormat("vi-VN").format(payload[0].value)}đ
        </p>
        <p className="tooltip-label">{data.orders} đơn hàng</p>
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="pie-tooltip">
        <p className="pie-tooltip-title">{data.name}</p>
        <p className="pie-tooltip-value">
          {new Intl.NumberFormat("vi-VN").format(data.revenue)}đ
        </p>
        <p className="pie-tooltip-label">{data.orders} đơn hàng</p>
      </div>
    );
  }
  return null;
};

const PaymentPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="pie-tooltip">
        <p className="pie-tooltip-title">{data.name}</p>
        <p className="pie-tooltip-label">
          {formatPaymentPieLine(data.orders, data.amount)}
        </p>
      </div>
    );
  }
  return null;
};

const renderPieLabel = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, fill, payload, percent } =
    props;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 5) * cos;
  const sy = cy + (outerRadius + 5) * sin;
  const mx = cx + (outerRadius + 15) * cos;
  const my = cy + (outerRadius + 15) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 20;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        strokeWidth={1.5}
        fill="none"
      />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 6}
        y={ey - 4}
        textAnchor={textAnchor}
        fill={fill}
        fontSize={14}
        fontWeight="bold"
      >
        {payload.name}
      </text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 6}
        y={ey + 14}
        textAnchor={textAnchor}
        fill="#888"
        fontSize={12}
        fontWeight="500"
      >
        {`${payload.orders} đơn | ${new Intl.NumberFormat("vi-VN").format(payload.revenue)}đ`}
      </text>
    </g>
  );
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfWeekMonday = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
};

const endOfWeekSunday = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

const endOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0);

const endOfYear = (date: Date) => new Date(date.getFullYear(), 11, 31);

const CHART_TITLES: Record<string, string> = {
  hour: "Tổng Quan Doanh Thu",
  day: "Tổng Quan Doanh Thu",
  month: "Tổng Quan Doanh Thu",
};

export default function RevenueReportPage() {
  const todayStr = getTodayYmd();

  const [filterType, setFilterType] = useState("Ngày");
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);

  // Stats data from API
  const [statsData, setStatsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!isValidDateRange(fromDate, toDate)) return;
    setIsLoading(true);
    try {
      const [statsRes, ordersRes] = await Promise.all([
        orderAPI.getStats({ fromDate, toDate }),
        orderAPI.getOrders({ fromDate, toDate, page: 0, size: 500 }),
      ]);
      setStatsData(statsRes.data);
      setOrders(unwrapOrdersList(ordersRes.data));
    } catch (err) {
      console.error("Error fetching revenue data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterClick = (type: string) => {
    setFilterType(type);
    const d = new Date();
    if (type === "Ngày") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (type === "Tuần") {
      setFromDate(formatDate(startOfWeekMonday(d)));
      setToDate(clampToToday(formatDate(endOfWeekSunday(d))));
    } else if (type === "Tháng") {
      setFromDate(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      );
      setToDate(clampToToday(formatDate(endOfMonth(d))));
    } else if (type === "Năm") {
      setFromDate(`${d.getFullYear()}-01-01`);
      setToDate(clampToToday(formatDate(endOfYear(d))));
    }
  };

  const handleClear = () => {
    setFilterType("Ngày");
    setFromDate(todayStr);
    setToDate(todayStr);
  };

  const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

  const chartData = (
    statsData?.chartData ||
    statsData?.hourlyData ||
    statsData?.dailyData ||
    []
  ).map((d: any) => ({
    time: d.time,
    tooltipLabel: d.tooltipLabel,
    revenue: num(d.revenue),
    orders: num(d.orders),
  }));

  const chartGranularity = statsData?.chartGranularity || "hour";
  const chartTitle = CHART_TITLES[chartGranularity] || CHART_TITLES.hour;

  const TYPE_KEYS = ["FULLTIME", "PACKAGE_4H", "TAKEAWAY"] as const;
  const typeData = TYPE_KEYS.map((key) => ({
    name: SESSION_TYPE_LABEL[key] || key,
    value: num(statsData?.ordersByType?.[key]),
    revenue: num(statsData?.revenueByType?.[key]),
    orders: num(statsData?.ordersByType?.[key]),
    color: TYPE_COLORS[key] || PIE_SERVICE_TYPE_COLORS.TAKEAWAY,
  }));

  const hasPieData = typeData.some((d) => d.value > 0);

  const paymentData = statsData
    ? withPaymentPieColors(buildPaymentPieSlices(statsData, orders))
    : [];
  const hasPaymentPieData = paymentData.length > 0;
  const hasBarData = chartData.length > 0;

  const totalRevenue = num(statsData?.totalRevenue);
  const totalOrders = num(statsData?.totalOrders);
  const avgOrderValue = num(statsData?.avgOrderValue);
  const topProducts = statsData?.topProducts || [];

  const formatCurrencyFull = (v: number) =>
    new Intl.NumberFormat("vi-VN").format(v) + "đ";

  return (
    <div className="revenue-report-container">
      <div className="sticky-header">
        <h1 className="revenue-report-title">BÁO CÁO DOANH THU</h1>
        <div className="revenue-filter-card">
          <div className="filter-buttons">
            {["Ngày", "Tuần", "Tháng", "Năm"].map((type) => (
              <button
                key={type}
                className={`filter-btn ${filterType === type ? "active" : ""}`}
                onClick={() => handleFilterClick(type)}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="date-input-wrapper">
            <span className="date-label">Từ:</span>
            <div className="date-input-inner">
              <input
                type="date"
                value={fromDate}
                min="2000-01-01"
                max={toDate > todayStr ? todayStr : toDate || todayStr}
                onChange={(e) => {
                  const next = applyFromDateChange(e.target.value, toDate, todayStr);
                  setFromDate(next.from);
                  setToDate(next.to);
                  setFilterType("Tùy chỉnh");
                }}
                className="date-input"
              />
            </div>
          </div>
          <div className="date-input-wrapper">
            <span className="date-label">Đến:</span>
            <div className="date-input-inner">
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                max={todayStr}
                onChange={(e) => {
                  const next = applyToDateChange(e.target.value, fromDate, todayStr);
                  setFromDate(next.from);
                  setToDate(next.to);
                  setFilterType("Tùy chỉnh");
                }}
                className="date-input"
              />
            </div>
          </div>
          <button className="btn-clear" onClick={handleClear}>
            Xóa
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="revenue-metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-icon-bg green-bg">
              <img
                src={iconSale}
                alt="Tổng Doanh Thu"
                className="metric-icon-img"
              />
            </div>
            <span className="metric-title">Tổng Doanh Thu</span>
          </div>
          <div className="metric-value">
            {isLoading ? "---" : formatCurrencyFull(totalRevenue)}
          </div>
          <div className="metric-badge-container">
            <span className="metric-comparison">
              Từ {orders.filter((o) => o.status === "COMPLETED").length} đơn
              hoàn tất
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-icon-bg red-bg">
              <img src={iconOrder} alt="Tổng Đơn" className="metric-icon-img" />
            </div>
            <span className="metric-title">Tổng Đơn</span>
          </div>
          <div className="metric-value red-text">
            {isLoading ? "---" : `${totalOrders} đơn`}
          </div>
          <div className="metric-badge-container">
            <span className="metric-comparison">Đã hoàn thành trong kỳ</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-icon-bg green-bg">
              <img
                src={iconAverage}
                alt="Trung Bình"
                className="metric-icon-img"
              />
            </div>
            <span className="metric-title">Trung Bình Giá Trị Đơn</span>
          </div>
          <div className="metric-value green-text">
            {isLoading ? "---" : formatCurrencyFull(avgOrderValue)}
          </div>
          <div className="metric-badge-container">
            <span className="metric-comparison">Tổng ÷ Số đơn hoàn tất</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-icon-bg green-bg">
              <img
                src={iconProduct}
                alt="Tổng Đơn Kỳ"
                className="metric-icon-img"
              />
            </div>
            <span className="metric-title">Tổng Đơn (Kỳ)</span>
          </div>
          <div className="metric-value green-text">
            {isLoading ? "---" : orders.length}
          </div>
          <div className="metric-badge-container">
            <span className="metric-comparison">Gồm cả đơn đã hủy</span>
          </div>
        </div>
      </div>

      {/* Overview Chart */}
      <div className="dashboard-section chart-section">
        <h2 className="section-title">{chartTitle}</h2>
        <div className="chart-wrapper">
          {isLoading ? (
            <div className="chart-empty-state">Đang tải biểu đồ...</div>
          ) : !hasBarData ? (
            <div className="chart-empty-state">
              Chưa có doanh thu trong khoảng thời gian đã chọn
            </div>
          ) : (
            <ResponsiveContainer width="99%" height={250}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#eee"
                />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#888", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#aaa", fontSize: 11 }}
                  tickFormatter={(v) => (v === 0 ? "0" : `${v / 1000}k`)}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={<CustomTooltip />}
                />
                <Bar
                  dataKey="revenue"
                  fill="#338805"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pie Charts — Loại hình & Phương thức thanh toán */}
      <div className="dashboard-row pie-row">
        <div className="dashboard-section pie-section">
          <h2 className="section-title">Cơ Cấu Theo Loại Hình</h2>
          <div className="pie-wrapper">
            {isLoading ? (
              <div className="chart-empty-state">Đang tải biểu đồ...</div>
            ) : !hasPieData ? (
              <div className="chart-empty-state">
                Chưa có đơn hoàn tất trong khoảng thời gian đã chọn
              </div>
            ) : (
              <ResponsiveContainer width="99%" height={250}>
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    labelLine={false}
                    label={renderPieLabel}
                  >
                    {typeData.map((entry: any, index: number) => (
                      <Cell key={`type-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="dashboard-section pie-section">
          <h2 className="section-title">Cơ Cấu Theo Phương Thức Thanh Toán</h2>
          <div className="pie-wrapper">
            {isLoading ? (
              <div className="chart-empty-state">Đang tải biểu đồ...</div>
            ) : !hasPaymentPieData ? (
              <div className="chart-empty-state">
                Chưa có dữ liệu thanh toán trong khoảng thời gian đã chọn
              </div>
            ) : (
              <ResponsiveContainer width="99%" height={250}>
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    labelLine={false}
                    label={renderPaymentPieLabel}
                  >
                    {paymentData.map((entry: any, index: number) => (
                      <Cell
                        key={`pay-cell-${index}`}
                        fill={paymentPieColorForLabel(entry.name)}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PaymentPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="dashboard-section top-products-section">
        <div className="section-header-row">
          <h2 className="section-title">Doanh thu Sản phẩm</h2>
          <button className="btn-sort">
            <ArrowDownUp size={14} /> Giảm dần
          </button>
        </div>
        <div className="table-responsive">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Sản Phẩm</th>
                <th>Danh Mục</th>
                <th>Doanh Thu</th>
                <th>Số Lượng Bán</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#888",
                    }}
                  >
                    Đang tải...
                  </td>
                </tr>
              ) : topProducts.length > 0 ? (
                topProducts.map((p: any, i: number) => (
                  <tr key={i}>
                    <td className="sku-text">{p.sku}</td>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.category}</td>
                    <td>{formatCurrencyFull(p.revenue)}</td>
                    <td>
                      {p.qty} {p.unit || "ly"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#888",
                    }}
                  >
                    Chưa có dữ liệu doanh thu sản phẩm
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order List */}
      <div className="dashboard-section order-list-section">
        <h2 className="section-title">Danh Sách Đơn Hàng</h2>
        <div className="table-responsive">
          <table className="dashboard-table full-table">
            <thead>
              <tr>
                <th>Mã Đơn</th>
                <th>Thời Gian</th>
                <th>Nhân Viên</th>
                <th>Loại Hình</th>
                <th>PTTT</th>
                <th>Tổng Tiền</th>
                <th>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#888",
                    }}
                  >
                    Đang tải...
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map((o: any, i: number) => {
                  const dt = new Date(o.createdAt);
                  const timeStr = dt.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const dateStr = dt.toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                  });
                  const isCompleted = o.status === "COMPLETED";
                  const sessionTypeKey = o.sessionType || "TAKEAWAY";
                  const typeLabel =
                    SESSION_TYPE_LABEL[sessionTypeKey] || sessionTypeKey;

                  const typeColors: Record<
                    string,
                    { bg: string; color: string }
                  > = {
                    "Mang đi": { bg: "#fef0e6", color: "#d97706" },
                    "4H": { bg: "#e6f0ff", color: "#0056b3" },
                    "Cả ngày": { bg: "#f3e8ff", color: "#7e22ce" },
                  };
                  const typeStyle = typeColors[typeLabel] || {
                    bg: "#f0f0f0",
                    color: "#555",
                  };

                  const paymentLabel: Record<string, string> = {
                    CASH: "Tiền mặt",
                    BANK_TRANSFER: "Chuyển khoản",
                  };

                  return (
                    <tr key={i}>
                      <td className="sku-text font-medium">{o.orderCode}</td>
                      <td>
                        {timeStr} - {dateStr}
                      </td>
                      <td>{o.employeeName || "--"}</td>
                      <td>
                        <span
                          className="type-badge"
                          style={{
                            backgroundColor: typeStyle.bg,
                            color: typeStyle.color,
                          }}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td>
                        {o.paymentMethod
                          ? paymentLabel[o.paymentMethod] || o.paymentMethod
                          : "--"}
                      </td>
                      <td>{formatCurrencyFull(o.totalAmount)}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: isCompleted
                              ? "#e8f5e9"
                              : "#fce4e4",
                            color: isCompleted ? "#256e05" : "#dc3545",
                          }}
                        >
                          {isCompleted ? "Hoàn thành" : "Đã hủy"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#888",
                    }}
                  >
                    Chưa có đơn hàng trong khoảng thời gian này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
