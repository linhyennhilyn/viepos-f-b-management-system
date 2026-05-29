import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search, FileText, X } from "lucide-react";
import { showToast } from "../components/Toast";
import * as XLSX from "xlsx";
import { orderAPI, staffAPI, unwrapOrdersList } from "../services/api";
import {
  applyFromDateChange,
  applyToDateChange,
  getTodayYmd,
  isValidDateRange,
} from "../utils/dateRangeFilter";
import { parseApiDateTime, splitDateTimeVN } from "../utils/dateTime";
import iconExportExcel from "../../assets/icon/exportexcel_white.png";
import CustomSelect from "../components/CustomSelect";
import "./OrderManagementPage.css";

interface OrderProduct {
  id: string;
  productName: string;
  productSku: string;
  categoryName: string;
  serviceType: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  note?: string;
}

interface Order {
  id: string;
  orderCode: string;
  createdAt: string;
  completedAt?: string;
  employeeId?: string;
  employeeName?: string;
  sessionType?: string;
  totalAmount: number;
  subtotalAmount: number;
  discountAmount: number;
  status: "COMPLETED" | "CANCELLED";
  note?: string;
  paymentMethod?: string;
  paymentAmount?: number;
  cashReceived?: number;
  /** URL/base64 — chỉ có sau khi gọi GET /api/orders/{id} */
  transferProofImageUrl?: string;
  transfer_proof_image_url?: string;
  /** Danh sách chỉ có ở API chi tiết */
  hasTransferProof?: boolean;
  items: OrderProduct[];
}

function mapOrderFromApi(raw: Record<string, unknown>): Order {
  const proof =
    (typeof raw.transfer_proof_image_url === 'string' && raw.transfer_proof_image_url.trim()) ||
    (typeof raw.transferProofImageUrl === 'string' && raw.transferProofImageUrl.trim()) ||
    undefined;
  const itemsRaw = raw.items;
  const items = Array.isArray(itemsRaw)
    ? (itemsRaw as Record<string, unknown>[]).map((it) => ({
        id: String(it.id ?? ""),
        productName: String(it.productName ?? ""),
        productSku: String(it.productSku ?? ""),
        categoryName: String(it.categoryName ?? ""),
        serviceType: String(it.serviceType ?? ""),
        unitPrice: Number(it.unitPrice ?? 0),
        quantity: Number(it.quantity ?? 0),
        lineTotal: Number(it.lineTotal ?? 0),
        note: it.note != null ? String(it.note) : undefined,
      }))
    : [];

  const statusRaw = String(raw.status ?? "COMPLETED");
  const status: Order["status"] =
    statusRaw === "CANCELLED" ? "CANCELLED" : "COMPLETED";

  return {
    id: String(raw.id ?? ""),
    orderCode: String(raw.orderCode ?? ""),
    createdAt: String(raw.createdAt ?? ""),
    completedAt: raw.completedAt != null ? String(raw.completedAt) : undefined,
    employeeId: raw.employeeId != null ? String(raw.employeeId) : undefined,
    employeeName: raw.employeeName != null ? String(raw.employeeName) : undefined,
    sessionType: raw.sessionType != null ? String(raw.sessionType) : undefined,
    totalAmount: Number(raw.totalAmount ?? 0),
    subtotalAmount: Number(raw.subtotalAmount ?? 0),
    discountAmount: Number(raw.discountAmount ?? 0),
    status,
    note: raw.note != null ? String(raw.note) : undefined,
    paymentMethod: raw.paymentMethod != null ? String(raw.paymentMethod) : undefined,
    paymentAmount: raw.paymentAmount != null ? Number(raw.paymentAmount) : undefined,
    cashReceived: raw.cashReceived != null ? Number(raw.cashReceived) : undefined,
    transferProofImageUrl: proof,
    transfer_proof_image_url: proof,
    hasTransferProof: Boolean(raw.hasTransferProof) || Boolean(proof),
    items,
  };
}

const SERVICE_TYPE_LABEL: Record<string, string> = {
  TAKEAWAY: "Mang đi",
  FOUR_HOURS: "Tại chỗ 4H",
  FULL_DAY: "Tại chỗ cả ngày",
  PACKAGE_4H: "Tại chỗ 4H",
  FULLTIME: "Tại chỗ cả ngày",
};

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
};

function TransferProofViewIcon() {
  return (
    <svg
      className="transfer-proof-view-icon"
      width="20"
      height="20"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M8 4H4V8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M28 4H32V8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M4 28V32H8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M32 28V32H28"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="11"
        y1="13"
        x2="25"
        y2="13"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="11"
        y1="18"
        x2="21"
        y2="18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="11"
        y1="23"
        x2="25"
        y2="23"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function OrderManagementPage() {
  const today = getTodayYmd();
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>(
    []
  );
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasOrdersLoadedRef = useRef(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [currentNote, setCurrentNote] = useState("");
  const [currentStatus, setCurrentStatus] = useState<"COMPLETED" | "CANCELLED">(
    "COMPLETED"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isTransferProofOpen, setIsTransferProofOpen] = useState(false);

  const dateRangeParams = useMemo(
    () => (isValidDateRange(fromDate, toDate) ? { fromDate, toDate } : null),
    [fromDate, toDate]
  );

  const fetchOrders = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!dateRangeParams) return;
      const silent = options?.silent === true;
      if (!silent) setIsInitialLoading(true);
      setIsRefreshing(true);
      try {
        const params: Record<string, string | number> = {
          fromDate: dateRangeParams.fromDate,
          toDate: dateRangeParams.toDate,
          page: 0,
          size: 500,
        };
        if (statusFilter !== "all") params.status = statusFilter;
        if (employeeFilter !== "all") params.employeeId = employeeFilter;
        const res = await orderAPI.getOrders(params);
        const list = unwrapOrdersList(res.data)
          .map((row) => mapOrderFromApi(row))
          .sort(
            (a, b) =>
              parseApiDateTime(b.completedAt || b.createdAt).getTime() -
              parseApiDateTime(a.completedAt || a.createdAt).getTime()
          );
        setOrders(list);
        hasOrdersLoadedRef.current = list.length > 0;
        setSelectedOrderId((prevId) => {
          const nextId =
            prevId && list.some((o) => o.id === prevId)
              ? prevId
              : list.length > 0
                ? list[0].id
                : null;
          if (nextId) {
            const order = list.find((o) => o.id === nextId);
            if (order) {
              setCurrentStatus(order.status);
              setCurrentNote(order.note || "");
            }
          }
          return nextId;
        });
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [dateRangeParams, statusFilter, employeeFilter]
  );

  useEffect(() => {
    if (!dateRangeParams) return;
    fetchOrders();
  }, [dateRangeParams, statusFilter, employeeFilter, fetchOrders]);

  useEffect(() => {
    staffAPI
      .getAll()
      .then((res) => {
        const mapped = res.data.map((s: any) => ({
          id: s.employeeId || s.id,
          name: s.name || s.fullName,
        }));
        setStaffList(mapped);
      })
      .catch(() => {});
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchSearch =
      order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.employeeName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const listSelected =
    orders.find((o) => o.id === selectedOrderId) ||
    filteredOrders.find((o) => o.id === selectedOrderId) ||
    filteredOrders[0] ||
    null;

  const selectedOrder =
    orderDetail && orderDetail.id === selectedOrderId
      ? orderDetail
      : listSelected;

  const fetchOrderDetail = useCallback(async (orderId: string) => {
    setIsDetailLoading(true);
    try {
      const res = await orderAPI.getOrderById(orderId, { includeTransferProof: true });
      setOrderDetail(mapOrderFromApi(res.data as Record<string, unknown>));
    } catch (err) {
      console.error("Error fetching order detail:", err);
      setOrderDetail(null);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOrderId) {
      fetchOrderDetail(selectedOrderId);
    } else {
      setOrderDetail(null);
    }
  }, [selectedOrderId, fetchOrderDetail]);

  const handleSelectOrder = (order: Order) => {
    setSelectedOrderId(order.id);
    setCurrentStatus(order.status);
    setCurrentNote(order.note || "");
    setIsTransferProofOpen(false);
    setOrderDetail(null);
  };

  const isBankTransfer = (method?: string) =>
    method === "BANK_TRANSFER" || method === "Chuyển khoản";

  const isEditable = selectedOrder?.status === "COMPLETED";
  const isSaveDisabled =
    !selectedOrder ||
    (currentStatus === selectedOrder.status &&
      currentNote === (selectedOrder.note || "")) ||
    (currentStatus === "CANCELLED" && currentNote.trim() === "");

  const handleSave = async () => {
    if (!selectedOrder || isSaveDisabled) return;
    const orderId = String(selectedOrder.id);
    setIsSaving(true);
    try {
      const res = await orderAPI.updateStatus(orderId, currentStatus, currentNote);
      const savedStatus = (res.data?.status ?? currentStatus) as Order["status"];
      const savedNote = res.data?.note ?? currentNote;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id
            ? { ...o, status: savedStatus, note: savedNote || undefined }
            : o
        )
      );
      setCurrentStatus(savedStatus);
      setCurrentNote(savedNote || "");
      showToast("Đã lưu trạng thái đơn hàng");
      await fetchOrders({ silent: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Không thể lưu trạng thái đơn hàng";
      showToast(msg, "error");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasFiltersChanged =
    searchTerm !== "" ||
    fromDate !== today ||
    toDate !== today ||
    employeeFilter !== "all" ||
    statusFilter !== "all";

  const handleClearFilters = () => {
    setSearchTerm("");
    setFromDate(today);
    setToDate(today);
    setEmployeeFilter("all");
    setStatusFilter("all");
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN").format(amount) + "đ";

  const formatDateTime = (isoStr: string) => splitDateTimeVN(isoStr);

  const formatDateDisplay = (dateString: string) => {
    const [y, m, d] = dateString.split("-");
    return `${d}/${m}/${y}`;
  };

  const slugForFileName = (text: string, maxLen = 24) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, maxLen);

  /** Tên file .xlsx theo bộ lọc hiện tại (ASCII, an toàn trên Windows). */
  const buildExportFileName = (orderCount: number) => {
    const from = fromDate.replace(/-/g, "");
    const to = toDate.replace(/-/g, "");
    const range = from === to ? from : `${from}-${to}`;

    const statusPart =
      statusFilter === "all"
        ? "TatCa"
        : statusFilter === "COMPLETED"
          ? "HoanTat"
          : "DaHuy";

    const parts = ["DonHang", range, statusPart];

    if (employeeFilter !== "all") {
      const staff = staffList.find((s) => s.id === employeeFilter);
      if (staff?.name) {
        const slug = slugForFileName(staff.name);
        if (slug) parts.push(slug);
      }
    }

    if (searchTerm.trim()) {
      const q = slugForFileName(searchTerm.trim(), 16);
      if (q) parts.push(`TK_${q}`);
    }

    parts.push(`${orderCount}don`);
    return `${parts.join("_")}.xlsx`;
  };

  const exportFileName = buildExportFileName(filteredOrders.length);

  const handleExportExcel = () => {
    const exportData = filteredOrders.map((order) => {
      const dt = formatDateTime(order.completedAt || order.createdAt);
      return {
        "Mã Đơn": order.orderCode,
        Ngày: typeof dt === "object" ? dt.date : "",
        Giờ: typeof dt === "object" ? dt.time : "",
        "Nhân viên": order.employeeName || "--",
        "Loại hình": order.sessionType
          ? SERVICE_TYPE_LABEL[order.sessionType] || order.sessionType
          : "Mang đi",
        "Phương thức thanh toán": order.paymentMethod
          ? PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod
          : "--",
        "Tổng tiền": order.totalAmount,
        "Trạng thái": order.status === "COMPLETED" ? "Hoàn tất" : "Đã hủy",
        "Ghi chú": order.note || "",
        "Danh sách sản phẩm": order.items
          .map((p) => `${p.productName} (x${p.quantity})`)
          .join(", "),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const wscols = [
      { wch: 18 },
      { wch: 12 },
      { wch: 10 },
      { wch: 20 },
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 50 },
    ];
    worksheet["!cols"] = wscols;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DonHang");
    XLSX.writeFile(workbook, buildExportFileName(filteredOrders.length));
  };

  return (
    <div className="orders-page-container">
      <div className="orders-page-header">
        <h1 className="orders-page-title">ĐƠN HÀNG</h1>
        <button
          className="btn-export-excel"
          onClick={() => setIsExportModalOpen(true)}
        >
          Xuất Excel{" "}
          <img
            src={iconExportExcel}
            alt="Export Excel"
            className="btn-icon-img"
          />
        </button>
      </div>

      <div className="orders-split-layout">
        <div className="orders-left-column">
          <div className="orders-filter-bar">
            <div className="orders-filter-row">
              <div className="orders-search-wrapper">
                <Search className="orders-search-icon" size={16} />
                <input
                  type="text"
                  className="orders-search-input"
                  placeholder="Tìm kiếm mã đơn, nhân viên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="orders-date-group">
                <span>Từ:</span>
                <input
                  type="date"
                  className="orders-date-input"
                  value={fromDate}
                  min="2000-01-01"
                  max={toDate > today ? today : toDate || today}
                  onChange={(e) => {
                    const next = applyFromDateChange(e.target.value, toDate, today);
                    setFromDate(next.from);
                    setToDate(next.to);
                  }}
                />
              </div>
              <div className="orders-date-group">
                <span>Đến:</span>
                <input
                  type="date"
                  className="orders-date-input"
                  value={toDate}
                  min={fromDate || undefined}
                  max={today}
                  onChange={(e) => {
                    const next = applyToDateChange(e.target.value, fromDate, today);
                    setFromDate(next.from);
                    setToDate(next.to);
                  }}
                />
              </div>
              <div className="orders-result-count">
                Kết quả: <strong>{filteredOrders.length}</strong> đơn
              </div>
            </div>
            <div className="orders-filter-row">
              <CustomSelect
                className="orders-filter-select"
                style={{ flex: 1 }}
                value={employeeFilter}
                onChange={(val) => setEmployeeFilter(val)}
                options={[
                  { value: "all", label: "Tất cả nhân viên" },
                  ...staffList.map((s) => ({ value: s.id, label: s.name }))
                ]}
              />
              <CustomSelect
                className="orders-filter-select"
                style={{ flex: 1 }}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "COMPLETED", label: "Hoàn tất" },
                  { value: "CANCELLED", label: "Đã hủy" }
                ]}
              />
              <button
                className="btn-clear-filter"
                onClick={handleClearFilters}
                disabled={!hasFiltersChanged}
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>

          <div
            className={`orders-list-panel${isRefreshing ? " panel-is-refreshing" : ""}`}
          >
            {isRefreshing && (
              <span className="panel-refresh-badge" aria-live="polite">
                Đang cập nhật...
              </span>
            )}
            <table className="orders-table">
              <thead>
                <tr>
                  <th style={{ width: "20%" }}>Mã Đơn</th>
                  <th style={{ width: "25%" }}>Thời Gian</th>
                  <th style={{ width: "25%" }}>Nhân Viên</th>
                  <th style={{ width: "15%" }}>Tổng tiền</th>
                  <th style={{ width: "15%", textAlign: "center" }}>T.Thái</th>
                </tr>
              </thead>
              <tbody>
                {isInitialLoading && filteredOrders.length === 0 ? (
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
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const dt = formatDateTime(order.completedAt || order.createdAt);
                    const isSelected = order.id === selectedOrderId;
                    return (
                      <tr
                        key={order.id}
                        className={isSelected ? "selected" : ""}
                        onClick={() => handleSelectOrder(order)}
                      >
                        <td className="order-id-text">{order.orderCode}</td>
                        <td>
                          <div>{typeof dt === "object" ? dt.date : "--"}</div>
                          <div className="order-time-text">
                            {typeof dt === "object" ? dt.time : "--"}
                          </div>
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {order.employeeName || "--"}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            className={`order-status-badge ${
                              order.status === "COMPLETED"
                                ? "status-completed"
                                : "status-cancelled"
                            }`}
                          >
                            {order.status === "COMPLETED"
                              ? "Hoàn tất"
                              : "Đã hủy"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#666",
                      }}
                    >
                      Không tìm thấy đơn hàng nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedOrder ? (
          <div
            className={`order-detail-panel${isRefreshing ? " panel-is-refreshing" : ""}`}
          >
            <div className="order-detail-header">
              <div className="order-detail-title-wrapper">
                <div className="order-detail-icon">
                  <FileText size={24} />
                </div>
                <h2 className="order-detail-title">
                  {selectedOrder.orderCode}
                </h2>
              </div>
              {isEditable && (
                <button
                  type="button"
                  className="btn-save-order"
                  disabled={isSaveDisabled || isSaving}
                  onClick={handleSave}
                >
                  {isSaving ? "Đang lưu..." : "Lưu"}
                </button>
              )}
            </div>

            <div className="order-detail-body">
              <div className="order-info-wrapper">
                <div className="order-info-grid">
                  <div className="order-info-item">
                    <span className="order-info-label">Ngày:</span>
                    <span className="order-info-value">
                      {typeof formatDateTime(selectedOrder.completedAt || selectedOrder.createdAt) ===
                      "object"
                        ? (formatDateTime(selectedOrder.completedAt || selectedOrder.createdAt) as any).date
                        : "--"}
                    </span>
                  </div>
                  <div className="order-info-item">
                    <span className="order-info-label">Nhân viên:</span>
                    <span className="order-info-value">
                      {selectedOrder.employeeName || "--"}
                    </span>
                  </div>
                  <div className="order-info-item">
                    <span className="order-info-label">Giờ hoàn thành:</span>
                    <span className="order-info-value">
                      {typeof formatDateTime(selectedOrder.completedAt || selectedOrder.createdAt) ===
                      "object"
                        ? (formatDateTime(selectedOrder.completedAt || selectedOrder.createdAt) as any).time
                        : "--"}
                    </span>
                  </div>
                  <div
                    className={`order-info-item${
                      isBankTransfer(selectedOrder.paymentMethod)
                        ? " order-info-item--bank-transfer"
                        : ""
                    }`}
                  >
                    <span className="order-info-label">
                      Phương thức thanh toán:
                    </span>
                    <span
                      className={`order-info-value${
                        isBankTransfer(selectedOrder.paymentMethod)
                          ? " order-payment-with-proof"
                          : ""
                      }`}
                    >
                      <span className="order-payment-method-text">
                        {selectedOrder.paymentMethod
                          ? PAYMENT_LABEL[selectedOrder.paymentMethod] ||
                            selectedOrder.paymentMethod
                          : "--"}
                      </span>
                      {isBankTransfer(selectedOrder.paymentMethod) &&
                        (selectedOrder.hasTransferProof ||
                          selectedOrder.transferProofImageUrl) && (
                        <button
                          type="button"
                          className="btn-transfer-proof-icon"
                          onClick={() => setIsTransferProofOpen(true)}
                          disabled={isDetailLoading || !selectedOrder.transferProofImageUrl}
                          title={
                            selectedOrder.transferProofImageUrl
                              ? "Xem minh chứng chuyển khoản"
                              : isDetailLoading
                                ? "Đang tải minh chứng..."
                                : "Không còn minh chứng (đã quá hạn lưu)"
                          }
                          aria-label="Xem minh chứng chuyển khoản"
                        >
                          <TransferProofViewIcon />
                        </button>
                      )}
                    </span>
                  </div>
                </div>

                <div className="order-status-group">
                  <span className="order-info-label">Trạng thái:</span>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="orderStatus"
                        value="COMPLETED"
                        checked={currentStatus === "COMPLETED"}
                        onChange={() => setCurrentStatus("COMPLETED")}
                        style={{
                          accentColor: "#256e05",
                          cursor: isEditable ? "pointer" : "default",
                        }}
                        disabled={!isEditable}
                      />
                      Hoàn Tất
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="orderStatus"
                        value="CANCELLED"
                        checked={currentStatus === "CANCELLED"}
                        onChange={() => setCurrentStatus("CANCELLED")}
                        style={{
                          accentColor: "#256e05",
                          cursor: isEditable ? "pointer" : "default",
                        }}
                        disabled={!isEditable}
                      />
                      Đã hủy
                    </label>
                  </div>
                </div>

                {currentStatus === "CANCELLED" && (
                  <div className="order-status-group">
                    <span className="order-info-label">
                      Ghi chú / Lý do hủy:
                    </span>
                    <input
                      type="text"
                      className="reason-input"
                      value={currentNote}
                      onChange={(e) => setCurrentNote(e.target.value)}
                      disabled={!isEditable}
                      placeholder="Nhập lý do hủy..."
                    />
                  </div>
                )}
              </div>

              <div className="order-products-section">
                <div className="order-products-title">Danh sách sản phẩm</div>
                <div className="order-products-table-wrapper">
                  <table className="order-products-table">
                    <thead>
                      <tr>
                        <th style={{ width: "40%" }}>SẢN PHẨM</th>
                        <th style={{ width: "25%", textAlign: "right" }}>
                          GIÁ
                        </th>
                        <th style={{ width: "10%", textAlign: "center" }}>
                          SL
                        </th>
                        <th style={{ width: "25%", textAlign: "right" }}>
                          TỔNG
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isDetailLoading && selectedOrder.items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            style={{
                              textAlign: "center",
                              padding: "16px",
                              color: "#888",
                            }}
                          >
                            Đang tải chi tiết...
                          </td>
                        </tr>
                      ) : selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((p, idx) => (
                          <tr key={idx}>
                            <td>
                              <div className="product-item-name">
                                {p.productName}
                              </div>
                              <div className="product-item-desc">
                                {SERVICE_TYPE_LABEL[p.serviceType] ||
                                  p.serviceType}
                              </div>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {formatCurrency(p.unitPrice)}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {p.quantity < 10 ? `0${p.quantity}` : p.quantity}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 600 }}>
                              {formatCurrency(p.lineTotal)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            style={{
                              textAlign: "center",
                              color: "#888",
                              padding: "20px",
                            }}
                          >
                            Chưa có sản phẩm
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="order-detail-footer">
              <div className="order-summary-row total">
                <span>Tổng cộng đơn</span>
                <span className="value">
                  {formatCurrency(selectedOrder.totalAmount)}
                </span>
              </div>
              <div className="order-summary-row small">
                <span>Tiền khách trả</span>
                <span>{formatCurrency(selectedOrder.cashReceived ?? selectedOrder.totalAmount)}</span>
              </div>
              <div className="order-summary-row small">
                <span>Tiền thừa</span>
                <span>{formatCurrency(Math.max(0, (selectedOrder.cashReceived ?? selectedOrder.totalAmount) - selectedOrder.totalAmount))}</span>
              </div>
              {selectedOrder.discountAmount > 0 && (
                <div className="order-summary-row small">
                  <span>Giảm giá</span>
                  <span>-{formatCurrency(selectedOrder.discountAmount)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="order-detail-panel empty-detail">
            <FileText size={64} className="empty-detail-icon" />
            <p className="empty-detail-text">
              {isInitialLoading
                ? "Đang tải dữ liệu..."
                : "Không có đơn hàng nào để hiển thị"}
            </p>
          </div>
        )}
      </div>

      {isTransferProofOpen &&
        selectedOrder &&
        isBankTransfer(selectedOrder.paymentMethod) && (
          <div
            className="transfer-proof-modal-overlay"
            onClick={() => setIsTransferProofOpen(false)}
          >
            <div
              className="transfer-proof-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="transfer-proof-modal-header">
                <h3 className="transfer-proof-modal-title">
                  Minh chứng chuyển khoản
                </h3>
                <button
                  type="button"
                  className="transfer-proof-modal-close"
                  onClick={() => setIsTransferProofOpen(false)}
                  aria-label="Đóng"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="transfer-proof-order-code">
                {selectedOrder.orderCode}
              </p>
              <div className="transfer-proof-total">
                <span className="transfer-proof-total-label">Tổng tiền</span>
                <span className="transfer-proof-total-value">
                  {formatCurrency(
                    selectedOrder.paymentAmount ?? selectedOrder.totalAmount
                  )}
                </span>
              </div>
              <div className="transfer-proof-image-wrap">
                {selectedOrder.transferProofImageUrl ? (
                  <img
                    src={selectedOrder.transferProofImageUrl}
                    alt="Minh chứng chuyển khoản"
                    className="transfer-proof-image"
                  />
                ) : (
                  <p className="transfer-proof-no-image">
                    Chưa có ảnh minh chứng chuyển khoản.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      {isExportModalOpen && (
        <div className="export-modal-overlay">
          <div className="export-modal">
            <h3 className="export-modal-title">Xác nhận xuất file Excel</h3>
            <div className="export-modal-content">
              <p>
                <strong>Thời gian:</strong>{" "}
                {fromDate === toDate
                  ? `Ngày ${formatDateDisplay(fromDate)}`
                  : `Từ ${formatDateDisplay(fromDate)} đến ${formatDateDisplay(
                      toDate
                    )}`}
              </p>
              <p>
                <strong>Trạng thái:</strong>{" "}
                {statusFilter === "all"
                  ? "Tất cả"
                  : statusFilter === "COMPLETED"
                  ? "Hoàn tất"
                  : "Đã hủy"}
              </p>
              <p>
                <strong>Tổng số đơn hàng:</strong> {filteredOrders.length}
              </p>
              <p>
                <strong>Nhân viên:</strong>{" "}
                {employeeFilter === "all"
                  ? "Tất cả"
                  : staffList.find((s) => s.id === employeeFilter)?.name ||
                    employeeFilter}
              </p>
              {searchTerm.trim() && (
                <p>
                  <strong>Tìm kiếm:</strong> &quot;{searchTerm.trim()}&quot;
                </p>
              )}
              <p className="export-modal-filename">
                <strong>Tên file xuất ra:</strong>
                <code>{exportFileName}</code>
              </p>
              {filteredOrders.length === 0 && (
                <p style={{ color: "#dc3545", marginTop: "10px" }}>
                  * Không có dữ liệu để xuất file.
                </p>
              )}
            </div>
            <div className="export-modal-actions">
              <button
                className="btn-cancel-export"
                onClick={() => setIsExportModalOpen(false)}
              >
                Hủy
              </button>
              <button
                className="btn-confirm-export"
                onClick={() => {
                  handleExportExcel();
                  setIsExportModalOpen(false);
                }}
                disabled={filteredOrders.length === 0}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
