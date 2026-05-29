import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import './InventoryManagementPage.css';
import api from '../services/api';
import { showToast } from '../components/Toast';
import CustomSelect from '../components/CustomSelect';

export interface InventoryProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  warningLimit: number;
  status: string;
  price: number;
}

interface ImportRow {
  id: string;
  productId: string | null;
  quantity: number;
}

const SearchableProductSelect = ({ 
  value, 
  onChange, 
  products 
}: { 
  value: string | null; 
  onChange: (productId: string | null) => void; 
  products: InventoryProduct[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [listMaxHeight, setListMaxHeight] = useState(200);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        // Only close if the click isn't inside the fixed dropdown
        const target = event.target as Element;
        if (!target.closest('.searchable-select-dropdown')) {
          setIsOpen(false);
        }
      }
    };

    const handleScroll = (e: Event) => {
      // Don't close if scrolling inside the dropdown itself
      if (e.target && (e.target as HTMLElement).closest('.searchable-select-dropdown')) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true); // capture phase
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const handleToggle = () => {
    if (!isOpen && wrapperRef.current) {
      // Calculate available space to .import-actions
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const actionsEl = document.querySelector('.import-actions');
      if (actionsEl) {
        const actionsRect = actionsEl.getBoundingClientRect();
        // The distance between the bottom of the select and the top of the actions div
        // Minus 50px for the search input box inside the dropdown, and some margin
        let availableSpace = actionsRect.top - wrapperRect.bottom - 50; 
        
        // Ensure a reasonable min and max height
        if (availableSpace < 80) availableSpace = 80;
        if (availableSpace > 250) availableSpace = 250;
        
        setListMaxHeight(availableSpace);
      }

      setDropdownStyle({
        position: 'fixed',
        top: `${wrapperRect.bottom + 4}px`,
        left: `${wrapperRect.left}px`,
        width: `${wrapperRect.width}px`,
        zIndex: 10000
      });
    }
    setIsOpen(!isOpen);
  };

  const selectedProduct = products.find(p => p.id === value);
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="searchable-select-wrapper" ref={wrapperRef}>
      <div className="searchable-select-header" onClick={handleToggle}>
        <span className="searchable-select-text">{selectedProduct ? selectedProduct.name : 'Chọn sản phẩm...'}</span>
        <ChevronDown size={16} color="#666" />
      </div>
      {isOpen && (
        <div className="searchable-select-dropdown" style={dropdownStyle}>
          <div className="searchable-select-search">
            <Search size={14} color="#999" />
            <input 
              type="text" 
              placeholder="Tìm sản phẩm, SKU..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="searchable-select-list" style={{ maxHeight: `${listMaxHeight}px` }}>
            {filteredProducts.map(p => (
              <div 
                key={p.id} 
                className={`searchable-select-item ${value === p.id ? 'selected' : ''}`}
                onClick={() => {
                  onChange(p.id);
                  setIsOpen(false);
                  setSearch('');
                }}
              >
                <div className="item-name">{p.name}</div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="searchable-select-empty">Không tìm thấy sản phẩm</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function InventoryManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả danh mục');
  const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái kho');

  const [inventoryData, setInventoryData] = useState<InventoryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/products');
      const mappedData: InventoryProduct[] = response.data.map((p: any) => {
        const stock = Number(p.currentStock || 0);
        const warningLimit = Number(p.minimumStock || 5);
        let status = 'An toàn';
        if (stock === 0) status = 'Hết hàng';
        else if (stock <= warningLimit) status = 'Cảnh báo';
        
        return {
          id: p.id,
          sku: p.sku || '--',
          name: p.name,
          category: p.categoryName || p.category?.name || 'Chưa phân loại',
          stock: stock,
          warningLimit: warningLimit,
          status: status,
          price: Number(p.priceTakeaway || 0)
        };
      });
      setInventoryData(mappedData);
    } catch (error) {
      console.error('Error fetching inventory products:', error);
    } finally {
      setIsLoading(false);
    }
  };


  
  // Transaction Modal State
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'import' | 'export'>('import');
  const [transactionTicketCode, setTransactionTicketCode] = useState('');
  const [transactionRows, setTransactionRows] = useState<ImportRow[]>([]);
  const [transactionNote, setTransactionNote] = useState('');
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);
  const [isSingleImport, setIsSingleImport] = useState(false);
  
  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const generateTicketCode = (type: 'import' | 'export') => {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${type === 'import' ? 'INV' : 'EXV'} - ${dateStr} - ${random}`;
  };

  const handleOpenTransactionModal = (type: 'import' | 'export', productId: string | null = null) => {
    setTransactionType(type);
    setTransactionTicketCode(generateTicketCode(type));
    setTransactionRows([{ id: Date.now().toString(), productId: productId, quantity: 0 }]);
    setTransactionNote('');
    setIsSingleImport(productId !== null);
    setIsTransactionModalOpen(true);
  };

  const handleCloseTransactionModal = () => {
    setIsTransactionModalOpen(false);
  };

  const handleAddTransactionRow = () => {
    setTransactionRows([...transactionRows, { id: Date.now().toString() + Math.random(), productId: null, quantity: 0 }]);
  };

  const handleRemoveTransactionRow = (id: string) => {
    setTransactionRows(transactionRows.filter(row => row.id !== id));
  };

  const requestRemoveRow = (id: string) => {
    const row = transactionRows.find(r => r.id === id);
    if (row && (row.productId !== null || Number(row.quantity) > 0)) {
      setRowToDelete(id);
    } else {
      handleRemoveTransactionRow(id);
    }
  };

  const confirmRemoveRow = () => {
    if (rowToDelete) {
      handleRemoveTransactionRow(rowToDelete);
      setRowToDelete(null);
    }
  };

  const handleReviewTransaction = () => {
    setIsReviewModalOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsLoading(true);
    try {
      const itemsToSubmit = transactionRows
        .filter(r => r.productId && Number(r.quantity) > 0)
        .map(r => ({
          productId: r.productId,
          quantity: Number(r.quantity)
        }));

      if (itemsToSubmit.length === 0) {
        showToast('Vui lòng thêm ít nhất một sản phẩm!', 'error');
        setIsLoading(false);
        return;
      }

      await api.post('/api/inventory/transaction', {
        type: transactionType,
        note: transactionNote,
        items: itemsToSubmit
      });

      await fetchProducts();

      setIsReviewModalOpen(false);
      setIsTransactionModalOpen(false);
      showToast(`Tạo phiếu ${transactionType === 'import' ? 'nhập' : 'xuất'} thành công!`);
    } catch (err) {
      console.error('Error saving transaction:', err);
      showToast('Lỗi khi lưu phiếu. Vui lòng thử lại.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackFromReview = () => {
    setIsReviewModalOpen(false);
  };

  const handleRowChange = (id: string, field: 'productId' | 'quantity', value: any) => {
    setTransactionRows(transactionRows.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const totalTransactionQuantity = transactionRows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  const totalTransactionProducts = transactionRows.filter(row => row.productId !== null && Number(row.quantity) > 0).length;
  
  const totalTransactionValue = transactionRows.reduce((sum, row) => {
    if (row.productId && Number(row.quantity) > 0) {
      const product = inventoryData.find(p => p.id === row.productId);
      if (product) {
        return sum + (Number(row.quantity) * product.price);
      }
    }
    return sum;
  }, 0);
  
  const isTransactionFormValid = transactionRows.length > 0 && transactionRows.every(row => {
    if (row.productId === null || Number(row.quantity) <= 0) return false;
    if (transactionType === 'export') {
      const product = inventoryData.find(p => p.id === row.productId);
      return product && Number(row.quantity) <= product.stock;
    }
    return true;
  });
  
  // Calculate counts based on ALL data
  const totalProducts = inventoryData.length;
  const safeCount = inventoryData.filter(item => item.status === 'An toàn').length;
  const warningCount = inventoryData.filter(item => item.status === 'Cảnh báo').length;
  const outOfStockCount = inventoryData.filter(item => item.status === 'Hết hàng').length;

  const categoryOptions = useMemo(() => {
    const names = new Set<string>();
    inventoryData.forEach((item) => {
      if (item.category) names.add(item.category);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [inventoryData]);

  // Filter data
  const filteredData = inventoryData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Tất cả danh mục' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'Tất cả trạng thái kho' || item.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="inventory-container">
      <div className="sticky-header">
        <div className="header-top-row">
          <h1 className="inventory-title">QUẢN LÝ TỒN KHO</h1>
          <div className="header-actions">
            <button className="btn-export" onClick={() => handleOpenTransactionModal('export')}>- Xuất kho</button>
            <button className="btn-import" onClick={() => handleOpenTransactionModal('import')}>+ Nhập kho</button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="inventory-metrics-grid">
          <div 
            className={`metric-card ${statusFilter === 'Tất cả trạng thái kho' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Tất cả trạng thái kho')}
          >
            <div className="metric-icon-bg default-bg">
              <span className="metric-icon gray-text">📦</span>
            </div>
            <div className="metric-content">
              <span className="metric-title">Tổng sản phẩm</span>
              <div className="metric-value dark-text">{totalProducts}</div>
            </div>
          </div>
          <div 
            className={`metric-card ${statusFilter === 'An toàn' ? 'active' : ''}`}
            onClick={() => setStatusFilter('An toàn')}
          >
            <div className="metric-icon-bg green-bg">
              <span className="metric-icon green-text">✓</span>
            </div>
            <div className="metric-content">
              <span className="metric-title">Tồn kho an toàn</span>
              <div className="metric-value green-text">{safeCount}</div>
            </div>
          </div>
          <div 
            className={`metric-card ${statusFilter === 'Cảnh báo' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Cảnh báo')}
          >
            <div className="metric-icon-bg yellow-bg">
              <span className="metric-icon yellow-text">!</span>
            </div>
            <div className="metric-content">
              <span className="metric-title">Cảnh báo tồn kho</span>
              <div className="metric-value yellow-text">{warningCount}</div>
            </div>
          </div>
          <div 
            className={`metric-card ${statusFilter === 'Hết hàng' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Hết hàng')}
          >
            <div className="metric-icon-bg red-bg">
              <span className="metric-icon red-text">✕</span>
            </div>
            <div className="metric-content">
              <span className="metric-title">Đã hết hàng</span>
              <div className="metric-value red-text">{outOfStockCount}</div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="inventory-filter-bar">
          <div className="inventory-search-wrapper">
            <Search size={16} className="inventory-search-icon" />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo tên sản phẩm, SKU" 
              className="inventory-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="inventory-filter-select-wrapper">
            <CustomSelect 
              className="inventory-filter-select"
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val)}
              options={[
                { value: "Tất cả danh mục", label: "Tất cả danh mục" },
                ...categoryOptions.map((name) => ({ value: name, label: name }))
              ]}
            />
          </div>
          <div className="inventory-filter-select-wrapper">
            <CustomSelect 
              className="inventory-filter-select"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: "Tất cả trạng thái kho", label: "Tất cả trạng thái kho" },
                { value: "An toàn", label: "An toàn" },
                { value: "Cảnh báo", label: "Cảnh báo" },
                { value: "Hết hàng", label: "Hết hàng" }
              ]}
            />
          </div>
          
          <div className="results-count">
            Kết quả: <span className="count-number">{filteredData.length} sản phẩm</span>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Sản Phẩm</th>
              <th>Danh Mục</th>
              <th className="text-center">Tồn Kho</th>
              <th className="text-center">Ngưỡng Cảnh Báo</th>
              <th>Trạng Thái</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <tr key={item.id} className="hoverable-row">
                  <td className="sku-text">{item.sku}</td>
                  <td className="product-name">{item.name}</td>
                  <td>{item.category}</td>
                  <td className="text-center">{item.stock}</td>
                  <td className="text-center">{item.warningLimit}</td>
                  <td>
                    <span className={`status-badge ${
                      item.status === 'An toàn' ? 'safe' : 
                      item.status === 'Cảnh báo' ? 'warning' : 'danger'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-add-stock" onClick={() => handleOpenTransactionModal('import', item.id)}>+ Nhập thêm</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center" style={{ padding: '32px', color: '#888' }}>
                  Không tìm thấy sản phẩm nào phù hợp với bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Transaction Modal */}
      {isTransactionModalOpen && (
        <div className="import-modal-overlay">
          <div className="import-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="import-modal-header">
              <h2>{transactionType === 'import' ? 'Nhập Thêm Hàng' : 'Xuất Hàng'}</h2>
              <button className="import-modal-close" onClick={handleCloseTransactionModal}>
                <X size={24} color="#333" />
              </button>
            </div>
            
            <div className="import-modal-body">
              {/* Left Pane */}
              <div className="import-modal-left">
                <h3 className="pane-title">Thông tin phiếu {transactionType === 'import' ? 'nhập' : 'xuất'}</h3>
                <div className="form-group">
                  <label>Mã Phiếu</label>
                  <input type="text" value={transactionTicketCode} disabled className="disabled-input" />
                </div>
                <div className="form-group">
                  <label>Người {transactionType === 'import' ? 'nhập' : 'xuất'}</label>
                  <input type="text" value="Nguyễn Văn A" disabled className="disabled-input" />
                </div>
                <div className="form-group">
                  <label>Ghi chú</label>
                  <textarea 
                    placeholder="Nhập ghi chú..." 
                    value={transactionNote}
                    onChange={(e) => setTransactionNote(e.target.value)}
                    rows={4}
                  ></textarea>
                </div>
              </div>
              
              {/* Vertical Divider */}
              <div className="import-modal-divider"></div>

              {/* Right Pane */}
              <div className="import-modal-right">
                <h3 className="pane-title">Danh sách sản phẩm {transactionType === 'import' ? 'nhập' : 'xuất'}</h3>
                
                <div className="import-table-container">
                  <table className="import-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40%' }}>Sản Phẩm</th>
                        <th style={{ width: '15%', textAlign: 'center' }}>Tồn Kho</th>
                        <th style={{ width: '25%', textAlign: 'center' }}>{transactionType === 'import' ? 'Nhập' : 'Xuất'}</th>
                        {!isSingleImport && <th style={{ width: '20%', textAlign: 'center' }}>Hành Động</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {transactionRows.map(row => {
                        const product = inventoryData.find(p => p.id === row.productId);
                        // Validation logic for error highlight in export
                        const isExportExceeding = transactionType === 'export' && product && Number(row.quantity) > product.stock;
                        
                        return (
                          <tr key={row.id}>
                            <td>
                              {isSingleImport && product ? (
                                <div style={{ fontWeight: 600, color: '#333' }}>{product.name}</div>
                              ) : (
                                <SearchableProductSelect 
                                  value={row.productId} 
                                  onChange={(val) => handleRowChange(row.id, 'productId', val)} 
                                  products={inventoryData}
                                />
                              )}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>
                              {product ? product.stock : 0}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="number" 
                                min="0" 
                                className="import-qty-input"
                                style={isExportExceeding ? { borderColor: '#dc3545', color: '#dc3545', backgroundColor: '#fff5f5' } : {}}
                                value={row.quantity || ''}
                                onChange={(e) => handleRowChange(row.id, 'quantity', parseInt(e.target.value) || 0)}
                              />
                            </td>
                            {!isSingleImport && (
                              <td style={{ textAlign: 'center' }}>
                                <button 
                                  className="btn-remove-row" 
                                  onClick={() => requestRemoveRow(row.id)}
                                  disabled={transactionRows.length <= 1}
                                >
                                  Xóa
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {!isSingleImport && (
                  <button 
                    className="btn-add-product-row" 
                    onClick={handleAddTransactionRow}
                    disabled={!isTransactionFormValid}
                  >
                    + Thêm sản phẩm
                  </button>
                )}

                {isSingleImport ? (
                  <div className="import-summary">
                    <span>Tổng lượng {transactionType === 'import' ? 'nhập' : 'xuất'}: <strong>{totalTransactionQuantity}</strong></span>
                  </div>
                ) : (
                  <div className="import-summary">
                    <span>Số sản phẩm: <strong>{totalTransactionProducts}</strong></span>
                    <span>Tổng lượng {transactionType === 'import' ? 'nhập' : 'xuất'}: <strong>{totalTransactionQuantity}</strong></span>
                  </div>
                )}

                <div className="import-actions">
                  <button className="btn-cancel" onClick={handleCloseTransactionModal}>HỦY</button>
                  <button 
                    className="btn-save" 
                    onClick={handleReviewTransaction}
                    disabled={!isTransactionFormValid}
                  >
                    LƯU
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {rowToDelete && (
        <div className="import-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="confirm-modal-content">
            <h3>Xác nhận xóa</h3>
            <p>Dòng sản phẩm này đã được chọn dữ liệu hoặc số lượng. Bạn có chắc chắn muốn xóa?</p>
            <div className="confirm-modal-actions">
              <button className="btn-cancel" onClick={() => setRowToDelete(null)} style={{ padding: '8px 24px' }}>Hủy</button>
              <button className="btn-delete-confirm" onClick={confirmRemoveRow}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {isReviewModalOpen && (
        <div className="import-modal-overlay" style={{ zIndex: 10001 }}>
          <div className="review-modal-content">
            <div className="review-modal-header">
              <div className="review-modal-title">
                <span className="review-icon">📦</span>
                <h2>Bảng kiểm tra biến động tồn kho thực tế</h2>
              </div>
              <button className="import-modal-close" onClick={handleBackFromReview}>
                <X size={24} color="#888" />
              </button>
            </div>
            
            <div className="review-modal-body">
              <p className="review-modal-subtitle">
                Hệ thống sẽ {transactionType === 'import' ? 'tăng' : 'giảm'} lượng tồn kho thực tế của các sản phẩm tương ứng theo số lượng phiếu {transactionType === 'import' ? 'nhập' : 'xuất'} này. Hãy rà soát kỹ lưỡng:
              </p>

              <div className="review-table-wrapper">
                <table className="review-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Sản phẩm</th>
                      <th style={{ textAlign: 'center' }}>Tồn kho cũ</th>
                      <th style={{ textAlign: 'center' }}>Lượng {transactionType === 'import' ? 'nhập' : 'xuất'}</th>
                      <th style={{ textAlign: 'center' }}>Tồn kho mới</th>
                      <th style={{ textAlign: 'right' }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionRows.filter(r => r.productId && r.quantity > 0).map(row => {
                      const product = inventoryData.find(p => p.id === row.productId)!;
                      const oldStock = product.stock;
                      const newStock = oldStock + (transactionType === 'import' ? row.quantity : -row.quantity);
                      const total = row.quantity * product.price;
                      return (
                        <tr key={row.id}>
                          <td style={{ fontWeight: 600 }}>{product.name}</td>
                          <td style={{ textAlign: 'center', color: '#666' }}>{oldStock}</td>
                          <td style={{ textAlign: 'center', color: transactionType === 'import' ? '#256e05' : '#dc3545', fontWeight: 600 }}>
                            {transactionType === 'import' ? '+' : '-'}{row.quantity}
                          </td>
                          <td style={{ textAlign: 'center', color: transactionType === 'import' ? '#256e05' : '#dc3545', fontWeight: 600 }}>{newStock}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{total.toLocaleString()} đ</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="review-summary-box">
                <div className="review-summary-left">
                  <div className="summary-label">TỔNG GIÁ TRỊ PHIẾU {transactionType === 'import' ? 'NHẬP' : 'XUẤT'}</div>
                  <div className="summary-value-large">{totalTransactionValue.toLocaleString()} đ</div>
                </div>
                <div className="review-summary-right">
                  <div className="summary-label" style={{ textAlign: 'right' }}>TỔNG SỐ LƯỢNG SẢN PHẨM</div>
                  <div className="summary-value-medium" style={{ textAlign: 'right' }}>{totalTransactionQuantity}</div>
                </div>
              </div>

              <div className="review-modal-actions">
                <button className="btn-review-back" onClick={handleBackFromReview} disabled={isLoading}>QUAY LẠI</button>
                <button className="btn-review-confirm" onClick={handleConfirmSave} disabled={isLoading}>
                  {isLoading ? 'ĐANG LƯU...' : 'XÁC NHẬN LƯU'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
