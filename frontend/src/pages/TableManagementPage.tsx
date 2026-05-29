import { useState, useEffect } from 'react';
import { cardAPI, productAPI } from '../services/api';
import { AlertTriangle, Search } from 'lucide-react';
import { showToast } from '../components/Toast';
import './TableManagementPage.css';
import { mapPosProduct, posUnitPrice, type PosProduct } from '../utils/posProduct';
import { isItemPackage4h, rowBackground } from '../utils/orderItemDisplay';
import { formatTimeVN, parseApiDateTime } from '../utils/dateTime';
import {
  getTableCardDisplay,
  resolveSessionDurationType,
} from '../utils/tableSessionDisplay';

interface Card {
  id: string;
  cardNumber: string;  // extracted numeric part from cardCode
  cardCode: string;    // original e.g. "CARD001"
  status: string;
}

interface CardSession {
  id: string;
  card: Card;
  startTime: string;
  endTime: string;
  actualEndTime: string | null;
  orderId: string;
  status: string;
  serviceType?: string;
}

type Product = PosProduct;

const lineUnitPrice = (
  item: { sku?: string; serveType: 'takeaway' | 'dine_in'; duration: '4h' | 'all_day'; price?: number },
  allProducts: Product[],
): number => {
  const product = allProducts.find(p => p.sku === item.sku);
  if (product) return posUnitPrice(product, item.serveType, item.duration);
  return Number(item.price ?? 0);
};

const decodeOrderIdToItems = (orderId: string, allProducts: Product[]) => {
  if (!orderId) return [];
  const parts = orderId.split('-');
  if (parts.length < 3) return [];
  
  const itemsPart = parts[2];
  const itemStrings = itemsPart.split('|');
  
  return itemStrings.map(itemStr => {
    const segments = itemStr.split('_');
    if (segments.length < 4) return null;
    const sku = segments[0];
    const quantity = parseInt(segments[1]) || 1;
    const serveType = segments[2] === 't' ? 'takeaway' : 'dine_in';
    const duration = segments[3] === '4' ? '4h' : 'all_day';
    
    const product = allProducts.find(p => p.sku === sku);
    if (!product) return null;

    const basePrice = posUnitPrice(product, serveType, duration);

    return {
      name: product.name,
      sku: product.sku,
      serveType,
      duration,
      quantity,
      price: basePrice
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);
};

export default function TableManagementPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [sessions, setSessions] = useState<CardSession[]>([]);
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | '4h' | 'all_day' | 'near_overdue' | 'overdue' | 'free'>('all');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  const [ordersMetadata, setOrdersMetadata] = useState<Record<string, any>>({});
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<CardSession | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pos_orders_metadata');
      const metadata = saved ? JSON.parse(saved) : {};
      setOrdersMetadata(metadata);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [cardsRes, sessionsRes, productsRes] = await Promise.all([
        cardAPI.getCards(),
        cardAPI.getSessions(),
        productAPI.getProducts().catch(errProd => {
          console.error(errProd);
          return null;
        })
      ]);

      if (productsRes?.data) {
        setProductList(productsRes.data.map((p: Record<string, unknown>) => mapPosProduct(p)));
      }
      
      // Map cardCode (e.g. "CARD001") -> cardNumber (e.g. "01")
      const mapCard = (c: any): Card => {
        const numericPart = c.cardCode ? c.cardCode.replace(/^CARD0*/i, '') : String(c.id);
        const cardNumber = numericPart.padStart(2, '0');
        const statusMap: Record<string, string> = {
          AVAILABLE: 'trống',
          IN_USE: 'Đang sử dụng',
          DISABLED: 'khóa',
        };
        return {
          id: c.id,
          cardCode: c.cardCode,
          cardNumber,
          status: statusMap[c.status] || c.status || 'trống',
        };
      };

      const sortedCards = [...cardsRes.data].map(mapCard).sort((a, b) => 
        parseInt(a.cardNumber) - parseInt(b.cardNumber)
      );
      setCards(sortedCards);

      // Map sessions - backend returns ServiceSession entity
      const mapSession = (s: any): CardSession => ({
        id: s.id,
        card: mapCard(s.card),
        startTime: s.startedAt || s.startTime,
        endTime: s.expectedEndAt || s.endTime,
        actualEndTime: s.actualEndAt || s.actualEndTime || null,
        orderId: s.order?.orderCode || s.orderId || '',
        status: s.status === 'ACTIVE' ? 'Đang sử dụng' : 'Hoàn thành',
        serviceType: s.serviceType,
      });
      
      const sortedSessions = [...sessionsRes.data].map(mapSession).sort((a, b) => 
        parseApiDateTime(b.startTime).getTime() - parseApiDateTime(a.startTime).getTime()
      );
      setSessions(sortedSessions);
    } catch (err) {
      console.error(err);
      setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReleaseConfirmed = async () => {
    if (!selectedSessionForDetail) return;
    const releaseConfirmCard = selectedSessionForDetail.card.cardNumber;
    setSelectedSessionForDetail(null);
    try {
      await cardAPI.releaseCard(releaseConfirmCard);
      setCards(prev => prev.map(c =>
        c.cardNumber === releaseConfirmCard ? { ...c, status: 'trống' } : c
      ));
      setSessions(prev => prev.map(s =>
        s.card.cardNumber === releaseConfirmCard && !s.actualEndTime
          ? { ...s, actualEndTime: new Date().toISOString(), status: 'Hoàn thành' }
          : s
      ));
      showToast(`Trả thẻ #${releaseConfirmCard} thành công!`);
    } catch (err) {
      console.error(err);
      showToast('Không thể thực hiện trả thẻ. Vui lòng thử lại.', 'error');
    }
  };

  const filteredCards = cards.filter(card => {
    if (searchQuery && !card.cardNumber.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    const activeSession = sessions.find(
      s => s.card.cardNumber === card.cardNumber &&
           s.status !== 'Hoàn thành' &&
           !s.actualEndTime
    );

    if (selectedFilter === 'all') return true;

    if (!activeSession) {
      if (selectedFilter === 'free') return card.status !== 'khóa';
      return false;
    }

    const durationType = resolveSessionDurationType(activeSession);
    const display = getTableCardDisplay(activeSession, currentTime);

    if (selectedFilter === '4h') {
      return durationType === '4h' && !display.isOverdue;
    }
    if (selectedFilter === 'all_day') {
      return durationType === 'all_day';
    }
    if (selectedFilter === 'near_overdue') {
      return display.isNearOverdue;
    }
    if (selectedFilter === 'overdue') {
      return display.isOverdue;
    }

    return true;
  });

  const getCardStatusWeight = (card: Card) => {
    const activeSession = sessions.find(
      s => s.card.cardNumber === card.cardNumber &&
           s.status !== 'Hoàn thành' &&
           !s.actualEndTime
    );

    if (activeSession) {
      const display = getTableCardDisplay(activeSession, currentTime);
      if (display.isOverdue) return 1;
      if (display.isNearOverdue) return 2;
      return 3;
    }

    if (card.status === 'khóa') return 5;
    return 4;
  };

  const getCardRemainingTime = (card: Card) => {
    const activeSession = sessions.find(
      s => s.card.cardNumber === card.cardNumber &&
           s.status !== 'Hoàn thành' &&
           !s.actualEndTime
    );
    if (activeSession) {
      return getTableCardDisplay(activeSession, currentTime).remainingTimeMs;
    }
    return Infinity;
  };

  const sortedCards = [...filteredCards].sort((a, b) => {
    const weightA = getCardStatusWeight(a);
    const weightB = getCardStatusWeight(b);
    if (weightA !== weightB) {
      return weightA - weightB;
    }
    if (weightA <= 3) {
      return getCardRemainingTime(a) - getCardRemainingTime(b);
    }
    return parseInt(a.cardNumber) - parseInt(b.cardNumber);
  });

  return (
    <div className="table-management-page">
      {/* Top Header */}
      <div className="tables-page-header-row">
        <h1 className="tables-page-title">BÀN</h1>
        <div className="tables-legend">
          <div className="legend-item">
            <span className="legend-dot legend-free"></span> Trống
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-in-use"></span> Đang sử dụng
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-near-overdue"></span> Sắp hết giờ
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-overdue"></span> Quá giờ
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="tables-alert-warning">
          {errorMessage}
        </div>
      )}

      {/* Filters Row */}
      <div className="tables-top-filters">
        <div className="tables-search-container">
          <Search size={18} color="#a0a0a0" />
          <input 
            type="text" 
            placeholder="Tìm kiếm..." 
            className="tables-search-input" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-pills-scroll">
          <button className={`pill-btn ${selectedFilter === 'all' ? 'active' : ''}`} onClick={() => setSelectedFilter('all')}>Tất cả</button>
          <button className={`pill-btn ${selectedFilter === 'all_day' ? 'active' : ''}`} onClick={() => setSelectedFilter('all_day')}>Cả ngày</button>
          <button className={`pill-btn ${selectedFilter === '4h' ? 'active' : ''}`} onClick={() => setSelectedFilter('4h')}>4H</button>
          <button className={`pill-btn ${selectedFilter === 'near_overdue' ? 'active' : ''}`} onClick={() => setSelectedFilter('near_overdue')}>Sắp hết giờ</button>
          <button className={`pill-btn ${selectedFilter === 'overdue' ? 'active' : ''}`} onClick={() => setSelectedFilter('overdue')}>Quá giờ</button>
          <button className={`pill-btn ${selectedFilter === 'free' ? 'active' : ''}`} onClick={() => setSelectedFilter('free')}>Trống</button>
        </div>
      </div>

      {/* Split Body Layout */}
      <div className="tables-split-body">
        {/* Left Side: Cards Grid */}
        <div className="tables-grid-panel">
          {loading ? (
            <div className="no-cards-found">Đang tải dữ liệu...</div>
          ) : sortedCards.length === 0 ? (
            <div className="no-cards-found">Không tìm thấy thẻ bàn nào phù hợp.</div>
          ) : (
            <div className="cards-grid-mockup">
              {sortedCards.map((card, idx) => {
                const activeSession = sessions.find(
                  s => s.card.cardNumber === card.cardNumber &&
                       s.status !== 'Hoàn thành' &&
                       !s.actualEndTime
                );

                let statusColor: 'overdue' | 'near-overdue' | 'in-use' | 'free' | 'locked' = 'free';
                let badgeText = 'Trống';
                let timerStr = 'TRỐNG';
                let subText = '';
                let durationType: '4h' | 'all_day' | null = null;

                if (activeSession) {
                  const display = getTableCardDisplay(activeSession, currentTime);
                  durationType = display.durationType;
                  statusColor = display.statusColor;
                  badgeText = display.badgeText;
                  timerStr = display.timerStr;

                  const startTimeStr = formatTimeVN(activeSession.startTime);
                  
                  let itemCount = ordersMetadata[activeSession.orderId]?.itemCount;
                  if (itemCount === undefined) {
                    const decoded = decodeOrderIdToItems(activeSession.orderId, productList);
                    if (decoded.length > 0) {
                      itemCount = decoded.reduce((sum, it) => sum + it.quantity, 0);
                    }
                  }
                  if (itemCount === undefined) {
                    if (card.cardNumber === '04') itemCount = 1;
                    else if (card.cardNumber === '08') itemCount = 2;
                    else if (card.cardNumber === '03') itemCount = 1;
                    else itemCount = 1;
                  }
                  subText = `Vào lúc ${startTimeStr} | ${itemCount} món`;
                } else if (card.status === 'khóa') {
                  statusColor = 'locked';
                  badgeText = 'Đã khóa';
                  timerStr = 'ĐÃ KHÓA';
                }

                const uniqueKey = `${card.id}-${card.cardNumber}-${idx}`;

                return (
                  <div 
                    key={uniqueKey} 
                    className={`table-card-box ${statusColor} ${activeSession ? 'clickable' : ''}`}
                    onClick={() => {
                      if (activeSession) {
                        setSelectedSessionForDetail(activeSession);
                      }
                    }}
                  >
                    {/* Card Header */}
                    <div className="table-card-header">
                      <span className="table-card-number">#{card.cardNumber}</span>
                      <span className="table-card-badge-tag">
                        {statusColor === 'overdue' && <AlertTriangle size={10} style={{ marginRight: '2px', display: 'inline', verticalAlign: 'middle' }} />}
                        {badgeText}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="table-card-body">
                      <div className="table-card-timer">{timerStr}</div>
                      {subText && <div className="table-card-subtext">{subText}</div>}

                      {/* Action Buttons */}
                      <div className="table-card-actions" onClick={(e) => e.stopPropagation()}>
                        {activeSession ? (
                          <>
                            {durationType === '4h' && (
                              <button
                                className="card-plus-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                title="Thêm món"
                              >
                                +
                              </button>
                            )}
                            <button
                              className="card-checkout-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSessionForDetail(activeSession);
                              }}
                            >
                              TRẢ THẺ
                            </button>
                          </>
                        ) : statusColor === 'locked' ? (
                          <button className="card-wide-btn card-locked-btn">ĐÃ KHÓA</button>
                        ) : (
                          <button className="card-wide-btn card-free-btn">+</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Detail Panel */}
        <div className="tables-detail-panel">
          {selectedSessionForDetail ? (
            <div className="tables-detail-card">
              <div className="tables-detail-header">
                <h2 className="tables-detail-title">#{selectedSessionForDetail.card.cardNumber}</h2>
              </div>
              <div className="tables-detail-body">
                <div className="tables-detail-info-grid">
                  <div className="tables-info-item">
                    <span className="tables-info-label">Ngày:</span>
                    <span className="tables-info-value">
                      {parseApiDateTime(selectedSessionForDetail.startTime).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="tables-info-item">
                    <span className="tables-info-label">Giờ vào:</span>
                    <span className="tables-info-value">
                      {parseApiDateTime(selectedSessionForDetail.startTime).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {(() => {
                    if (resolveSessionDurationType(selectedSessionForDetail) !== '4h') return null;
                    const display = getTableCardDisplay(selectedSessionForDetail, currentTime);

                    return (
                      <>
                        <div className="tables-info-item">
                          <span className="tables-info-label">Dự kiến ra:</span>
                          <span className="tables-info-value">
                            {parseApiDateTime(selectedSessionForDetail.endTime).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="tables-info-item">
                          <span className="tables-info-label">Thời gian còn lại:</span>
                          <span className="tables-info-value" style={{ color: '#C42326', fontWeight: 800, fontSize: '16px' }}>
                            {display.timerStr.replace(/ : /g, ':')}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="tables-products-section">
                  <h3 className="tables-section-title">Danh sách món nước & dịch vụ</h3>
                  <div className="tables-products-table-wrapper">
                    <table className="tables-products-table">
                      <thead>
                        <tr>
                          <th>SẢN PHẨM</th>
                          <th style={{ width: '65px', textAlign: 'right' }}>GIÁ</th>
                          <th style={{ width: '30px', textAlign: 'center' }}>SL</th>
                          <th style={{ width: '70px', textAlign: 'right' }}>TỔNG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let items: any[] = decodeOrderIdToItems(selectedSessionForDetail.orderId, productList);
                          if (items.length === 0) {
                            const metadata = ordersMetadata[selectedSessionForDetail.orderId];
                            items = metadata?.items || [];
                          }
                          
                          if (items.length === 0) {
                            return (
                              <tr>
                                <td colSpan={4} className="tables-no-products" style={{ backgroundColor: 'transparent' }}>
                                  Chưa có thông tin chi tiết món cho đơn hàng này.
                                </td>
                              </tr>
                            );
                          }
                          return items.map((item, index) => {
                            const serveText = item.serveType === 'takeaway' ? 'Mang đi' : `Tại chỗ ${item.duration === '4h' ? '4 giờ' : 'cả ngày'}`;
                            const unitPrice = lineUnitPrice(item, productList);
                            const isPackage4h = isItemPackage4h(item);
                            const bg = rowBackground(isPackage4h);
                            const cellStyle = { backgroundColor: bg };

                            return (
                              <tr key={index} className={isPackage4h ? 'row-package-4h' : undefined}>
                                <td style={cellStyle}>
                                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#111' }}>{item.name}</div>
                                  <div style={{ fontSize: '12px', color: '#333', marginTop: '4px' }}>{serveText}</div>
                                </td>
                                <td style={{ ...cellStyle, textAlign: 'right', fontSize: '13px' }}>{unitPrice.toLocaleString('vi-VN')}đ</td>
                                <td style={{ ...cellStyle, textAlign: 'center', fontSize: '13px' }}>{String(item.quantity).padStart(2, '0')}</td>
                                <td style={{ ...cellStyle, textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>
                                  {(unitPrice * item.quantity).toLocaleString('vi-VN')}đ
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="tables-sheet-footer">
                <div className="tables-sheet-total-row">
                  <span>Tổng cộng đơn:</span>
                  <span className="tables-total-price">
                    {(() => {
                      let items: any[] = decodeOrderIdToItems(selectedSessionForDetail.orderId, productList);
                      if (items.length === 0) {
                        const metadata = ordersMetadata[selectedSessionForDetail.orderId];
                        items = metadata?.items || [];
                      }
                      const total = items.reduce((sum, item) => {
                        const unitPrice = lineUnitPrice(item, productList);
                        return sum + (unitPrice * item.quantity);
                      }, 0);
                      return total > 0 ? `${total.toLocaleString('vi-VN')}đ` : 'Chưa tính';
                    })()}
                  </span>
                </div>
                <div className="tables-sheet-actions" style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="pill-btn active"
                    style={{ flex: 1, textAlign: 'center', padding: '12px', fontSize: '14px', fontWeight: 800 }}
                    onClick={handleReleaseConfirmed}
                  >
                    TRẢ THẺ
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="tables-no-selection">
              <span>Chọn một bàn đang sử dụng<br/>để xem chi tiết</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
