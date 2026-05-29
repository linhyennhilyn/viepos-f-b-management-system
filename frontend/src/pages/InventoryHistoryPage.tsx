import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { inventoryAPI } from '../services/api';
import {
  applyFromDateChange,
  applyToDateChange,
  getTodayYmd,
  isValidDateRange,
} from '../utils/dateRangeFilter';
import './InventoryHistoryPage.css';
import './InventoryManagementPage.css';
import CustomSelect from '../components/CustomSelect';

const TRANSACTION_TYPE_LABEL: Record<string, string> = {
  IMPORT: 'Nhập kho',
  EXPORT: 'Xuất kho',
  SALE: 'Bán hàng',
  ADJUSTMENT: 'Điều chỉnh',
};

const BADGE_CLASS: Record<string, string> = {
  IMPORT: 'badge-import',
  EXPORT: 'badge-export',
  SALE: 'badge-sale',
  ADJUSTMENT: 'badge-import',
};

export default function InventoryHistoryPage() {
  const todayStr = getTodayYmd();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [actionFilter, setActionFilter] = useState('ALL');

  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const fetchTransactions = useCallback(async () => {
    if (!isValidDateRange(fromDate, toDate)) return;
    setIsLoading(true);
    try {
      const params: any = { fromDate, toDate };
      if (actionFilter !== 'ALL') params.type = actionFilter;
      const res = await inventoryAPI.getTransactions(params);
      setTransactions(res.data);
    } catch (err) {
      console.error('Error fetching inventory transactions:', err);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, actionFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Flatten transactions into rows (one row per item per transaction)
  const flatRows = transactions.flatMap((t: any) =>
    t.items && t.items.length > 0
      ? t.items.map((item: any) => ({
          transactionId: t.id,
          transactionCode: t.transactionCode,
          createdAt: t.createdAt,
          transactionType: t.transactionType,
          note: t.note,
          staffName: t.createdBy?.name || '--',
          productName: item.productName || '--',
          productSku: item.productSku || '--',
          quantity: Number(item.quantity),
          stockBefore: Number(item.stockBefore),
          stockAfter: Number(item.stockAfter),
          // group reference
          _transaction: t,
        }))
      : [{
          transactionId: t.id,
          transactionCode: t.transactionCode,
          createdAt: t.createdAt,
          transactionType: t.transactionType,
          note: t.note,
          staffName: t.createdBy?.name || '--',
          productName: '--',
          productSku: '--',
          quantity: 0,
          stockBefore: 0,
          stockAfter: 0,
          _transaction: t,
        }]
  );

  const filteredRows = flatRows.filter(row => {
    const matchSearch = row.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.transactionCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  // Compute summary metrics from filtered results
  const totalOperations = new Set(filteredRows.map(r => r.transactionId)).size;
  const totalIncrease = filteredRows.filter(r => r.quantity > 0).reduce((sum, r) => sum + r.quantity, 0);
  const totalDecrease = filteredRows.filter(r => r.quantity < 0).reduce((sum, r) => sum + Math.abs(r.quantity), 0);

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = applyFromDateChange(e.target.value, toDate, todayStr);
    setFromDate(next.from);
    setToDate(next.to);
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = applyToDateChange(e.target.value, fromDate, todayStr);
    setFromDate(next.from);
    setToDate(next.to);
  };

  const getQuantityClass = (qty: number) => qty > 0 ? 'qty-positive' : 'qty-negative';
  const formatQuantity = (qty: number) => qty > 0 ? `+ ${qty}` : `- ${Math.abs(qty)}`;

  const formatDateTime = (isoStr: string) => {
    if (!isoStr) return '--';
    const d = new Date(isoStr);
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time} ${date}`;
  };

  return (
    <div className="inventory-history-container">
      <div className="history-sticky-header">
        <h1 className="history-title">LỊCH SỬ BIẾN ĐỘNG KHO</h1>

        {/* Metric Cards */}
        <div className="history-metrics-grid">
          <div className="history-metric-card card-gray">
            <div className="metric-card-title">Số lượng lượt biến động</div>
            <div className="metric-card-value-container">
              <span className="metric-value-number">{isLoading ? '--' : totalOperations}</span>
              <span className="metric-value-unit">Lượt thao tác</span>
            </div>
            <div className="metric-card-footer" />
          </div>

          <div className="history-metric-card card-green">
            <div className="metric-card-title">Tăng tồn kho</div>
            <div className="metric-card-value-container">
              <span className="metric-value-number">{isLoading ? '--' : `+ ${totalIncrease}`}</span>
              <span className="metric-value-unit">Sản phẩm</span>
            </div>
            <div className="metric-card-footer" />
          </div>

          <div className="history-metric-card card-red">
            <div className="metric-card-title">Giảm tồn kho</div>
            <div className="metric-card-value-container">
              <span className="metric-value-number">{isLoading ? '--' : `- ${totalDecrease}`}</span>
              <span className="metric-value-unit">Sản phẩm</span>
            </div>
            <div className="metric-card-footer" />
          </div>
        </div>

        {/* Filters */}
        <div className="history-filters-bar">
          <div className="history-search-container">
            <Search className="history-search-icon" size={18} />
            <input
              type="text"
              className="history-search-input"
              placeholder="Tìm sản phẩm, SKU, nhân viên, mã phiếu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="date-filter-group">
            <span className="date-label">Từ:</span>
            <input type="date" className="date-input" value={fromDate} min="2000-01-01" max={toDate > todayStr ? todayStr : toDate || todayStr} onChange={handleFromDateChange} />
          </div>

          <div className="date-filter-group">
            <span className="date-label">Đến:</span>
            <input type="date" className="date-input" value={toDate} min={fromDate || undefined} max={todayStr} onChange={handleToDateChange} />
          </div>

          <CustomSelect 
            className="history-type-select" 
            value={actionFilter} 
            onChange={(val) => setActionFilter(val)}
            options={[
              { value: "ALL", label: "Tất cả loại biến động" },
              { value: "IMPORT", label: "Nhập kho" },
              { value: "EXPORT", label: "Xuất kho" },
              { value: "SALE", label: "Bán hàng" },
              { value: "ADJUSTMENT", label: "Điều chỉnh" }
            ]}
          />

          <div className="history-results-count">{filteredRows.length} kết quả</div>
        </div>
      </div>

      {/* Table */}
      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th style={{ width: '13%' }}>Thời Gian</th>
              <th style={{ width: '20%' }}>Sản phẩm / SKU</th>
              <th style={{ width: '14%', textAlign: 'center' }}>Hành Động</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Số Lượng</th>
              <th style={{ width: '14%', textAlign: 'center' }}>Biến Động</th>
              <th style={{ width: '14%', textAlign: 'center' }}>Nhân Viên</th>
              <th style={{ width: '15%', textAlign: 'center' }}>Mã Phiếu</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#888' }}>Đang tải dữ liệu...</td></tr>
            ) : filteredRows.length > 0 ? (
              filteredRows.map((row, idx) => (
                <tr key={`${row.transactionId}-${idx}`}
                  onClick={() => setSelectedTransaction(row._transaction)}
                  className="history-table-row clickable-row"
                >
                  <td className="history-time">{formatDateTime(row.createdAt)}</td>
                  <td>
                    <div className="history-product-name">{row.productName}</div>
                    <div className="history-sku">{row.productSku}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`action-badge ${BADGE_CLASS[row.transactionType] || ''}`}>
                      {TRANSACTION_TYPE_LABEL[row.transactionType] || row.transactionType}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }} className={getQuantityClass(row.quantity)}>
                    {formatQuantity(row.quantity)}
                  </td>
                  <td style={{ textAlign: 'center' }} className="stock-change">
                    {row.stockBefore} → {row.stockAfter}
                  </td>
                  <td style={{ textAlign: 'center' }}>{row.staffName}</td>
                  <td style={{ textAlign: 'center' }} className="ref-code">{row.transactionCode}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#888' }}>
                  {transactions.length === 0
                    ? 'Chưa có biến động kho nào trong khoảng thời gian này'
                    : 'Không có dữ liệu phù hợp với bộ lọc'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="import-modal-overlay">
          <div className="import-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="import-modal-header">
              <h2>Chi tiết phiếu {selectedTransaction.transactionCode}</h2>
              <button className="import-modal-close" onClick={() => setSelectedTransaction(null)}>
                <X size={24} color="#333" />
              </button>
            </div>

            <div className="import-modal-body">
              {/* Left Pane */}
              <div className="import-modal-left">
                <h3 className="pane-title">Thông tin chung</h3>
                <div className="form-group">
                  <label>Mã Phiếu</label>
                  <input type="text" value={selectedTransaction.transactionCode} disabled className="disabled-input" />
                </div>
                <div className="form-group">
                  <label>Loại biến động</label>
                  <input type="text"
                    value={TRANSACTION_TYPE_LABEL[selectedTransaction.transactionType] || selectedTransaction.transactionType}
                    disabled className="disabled-input" />
                </div>
                <div className="form-group">
                  <label>Người thực hiện</label>
                  <input type="text" value={selectedTransaction.createdBy?.name || '--'} disabled className="disabled-input" />
                </div>
                <div className="form-group">
                  <label>Thời gian</label>
                  <input type="text" value={formatDateTime(selectedTransaction.createdAt)} disabled className="disabled-input" />
                </div>
                <div className="form-group">
                  <label>Ghi chú</label>
                  <textarea value={selectedTransaction.note || ''} disabled rows={4} className="disabled-input" />
                </div>
              </div>

              <div className="import-modal-divider" />

              {/* Right Pane */}
              <div className="import-modal-right">
                <h3 className="pane-title">
                  Danh sách sản phẩm ({TRANSACTION_TYPE_LABEL[selectedTransaction.transactionType] || selectedTransaction.transactionType})
                </h3>
                <div className="import-table-container">
                  <table className="import-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40%' }}>Sản Phẩm</th>
                        <th style={{ width: '20%', textAlign: 'center' }}>Số lượng</th>
                        <th style={{ width: '40%', textAlign: 'center' }}>Biến động tồn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                        selectedTransaction.items.map((item: any, index: number) => {
                          const qty = Number(item.quantity);
                          return (
                            <tr key={index}>
                              <td>
                                <div style={{ fontWeight: 600, color: '#333' }}>{item.productName || '--'}</div>
                                <div style={{ fontSize: '12px', color: '#888' }}>{item.productSku || '--'}</div>
                              </td>
                              <td style={{ textAlign: 'center' }} className={getQuantityClass(qty)}>
                                {formatQuantity(qty)}
                              </td>
                              <td style={{ textAlign: 'center' }} className="stock-change">
                                {Number(item.stockBefore)} → {Number(item.stockAfter)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: '16px', color: '#888' }}>
                            Không có sản phẩm trong phiếu này
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="import-actions" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    style={{
                      backgroundColor: '#f1f1f1', color: '#666', border: 'none',
                      padding: '10px 24px', borderRadius: '8px', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e2e2'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f1f1'}
                  >
                    ĐÓNG
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
