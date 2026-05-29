import { useState, useEffect } from 'react';
import { Search, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import api from '../services/api';
import './PosOrdersPage.css';
import './PosTablesPage.css';

const LOW_STOCK_THRESHOLD = 5; // fallback nếu minimumStock = 0

export default function PosOrdersPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/api/products');
        const mapped = res.data
          .filter((p: any) => p.isActive)
          .map((p: any) => {
            // Backend field: currentStock (BigDecimal → number)
            const stock = Number(p.currentStock ?? p.stockQuantity ?? p.stock ?? 0);
            // Dùng minimumStock từ DB nếu có, fallback về LOW_STOCK_THRESHOLD
            const minStock = Number(p.minimumStock ?? LOW_STOCK_THRESHOLD);
            const threshold = minStock > 0 ? minStock : LOW_STOCK_THRESHOLD;

            let status = 'safe';
            if (stock === 0) status = 'danger';
            else if (stock <= threshold) status = 'warning';
            return {
              id: p.id,
              name: p.name,
              category: p.categoryName || p.category?.name || 'Chưa phân loại',
              stock,
              status,
            };
          });
        setInventory(mapped);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);


  const safeCount = inventory.filter(i => i.status === 'safe').length;
  const warningCount = inventory.filter(i => i.status === 'warning').length;
  const dangerCount = inventory.filter(i => i.status === 'danger').length;

  const handleCardClick = (status: string) => {
    setSelectedStatus(prev => prev === status ? null : status);
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus ? item.status === selectedStatus : true;
    return matchesSearch && matchesStatus;
  });

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'safe':    return <CheckCircle2 size={20} color="#3b9016" />;
      case 'warning': return <AlertTriangle size={20} color="#f59e0b" />;
      case 'danger':  return <XCircle size={20} color="#dc2626" />;
      default:        return null;
    }
  };

  return (
    <div className="pos-inventory-container">
      <div className="pos-orders-header" style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#333', margin: 0 }}>Kho hàng</h2>
      </div>

      {/* Search Bar */}
      <div className="pos-inventory-search-bar">
        <div className="pos-inventory-search-input-wrapper">
          <div className="pos-inventory-search-box">
            <Search size={18} color="#999" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
                <X size={16} color="#999" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className={`pos-inventory-cards ${selectedStatus ? 'has-filter' : ''}`}>
        <div className={`inv-card safe-card ${selectedStatus === 'safe' ? 'active' : ''}`} onClick={() => handleCardClick('safe')}>
          <div className="inv-card-icon"><CheckCircle2 size={16} /></div>
          <div className="inv-card-title">Tồn kho an toàn</div>
          <div className="inv-card-number">{safeCount}</div>
        </div>
        <div className={`inv-card warning-card ${selectedStatus === 'warning' ? 'active' : ''}`} onClick={() => handleCardClick('warning')}>
          <div className="inv-card-icon"><AlertTriangle size={16} /></div>
          <div className="inv-card-title">Cảnh báo tồn kho</div>
          <div className="inv-card-number">{warningCount}</div>
        </div>
        <div className={`inv-card danger-card ${selectedStatus === 'danger' ? 'active' : ''}`} onClick={() => handleCardClick('danger')}>
          <div className="inv-card-icon"><XCircle size={16} /></div>
          <div className="inv-card-title">Hết hàng</div>
          <div className="inv-card-number">{dangerCount}</div>
        </div>
      </div>

      {/* Table */}
      <div className="pos-inventory-table-container">
        <div className="pos-inventory-table-body custom-scrollbar">
          <table className="pos-inventory-table">
            <thead>
              <tr>
                <th className="inv-th inv-th-name">Sản Phẩm</th>
                <th className="inv-th inv-th-category">Danh Mục</th>
                <th className="inv-th inv-th-stock">Tồn Kho</th>
                <th className="inv-th inv-th-status">TT</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#888' }}>Đang tải...</td></tr>
              ) : filteredInventory.length > 0 ? (
                filteredInventory.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="pos-inventory-row">
                    <td className="inv-td inv-td-name">{item.name}</td>
                    <td className="inv-td inv-td-category">{item.category}</td>
                    <td className="inv-td inv-td-stock">{item.stock}</td>
                    <td className="inv-td inv-td-status">{renderStatusBadge(item.status)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#888' }}>Không có sản phẩm</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
