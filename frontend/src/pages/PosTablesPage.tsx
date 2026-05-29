import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cardAPI, productAPI, orderAPI } from '../services/api';
import { Plus, AlertTriangle, RefreshCw, Search, X } from 'lucide-react';
import './PosTablesPage.css';
import { mapPosProduct, posUnitPrice, type PosProduct } from '../utils/posProduct';
import { isItemPackage4h, rowBackground } from '../utils/orderItemDisplay';
import { formatTimeVN, parseVNWallDateTime } from '../utils/dateTime';
import {
  getTableCardDisplay,
  resolveSessionDurationType,
} from '../utils/tableSessionDisplay';

interface Card {
  id: number;
  cardNumber: string;
  status: string; // "trống", "Đang sử dụng", "quá giờ", "khóa"
}

interface CardSession {
  id: number;
  card: Card;
  startTime: string;
  endTime: string;
  actualEndTime: string | null;
  orderId: string;
  orderDbId?: string | null; // Numeric DB id dùng để fetch chi tiết từ API
  status: string; // "Đang sử dụng", "Hoàn thành", "Quá giờ"
  serviceType: string;
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

// Helper function to dynamically decode cart products stored inside orderId
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
      price: basePrice,
      note: ''
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);
};

export default function PosTablesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const openCardNumber = location.state?.openCardNumber as string | undefined;
  const [cards, setCards] = useState<Card[]>([]);
  const [sessions, setSessions] = useState<CardSession[]>([]);
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | '4h' | 'all_day' | 'near_overdue'>('all');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Track detailed order metadata including items list
  const [ordersMetadata, setOrdersMetadata] = useState<Record<string, { 
    itemCount: number;
    items?: Array<{
      name: string;
      sku: string;
      serveType: 'takeaway' | 'dine_in';
      duration: '4h' | 'all_day';
      quantity: number;
      price: number;
      note?: string;
    }>;
  }>>({});

  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<CardSession | null>(null);
  // API-fetched items for detail modal (shared across all staff)
  const [apiDetailItems, setApiDetailItems] = useState<any[]>([]);
  const [isLoadingApiDetail, setIsLoadingApiDetail] = useState(false);

  // Trả thẻ popup states
  const [releaseConfirmCard, setReleaseConfirmCard] = useState<string | null>(null);
  const [releaseSuccessCard, setReleaseSuccessCard] = useState<string | null>(null);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  // Batch Release States
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedCardsForBatch, setSelectedCardsForBatch] = useState<string[]>([]);
  const [isBatchReleaseModalOpen, setIsBatchReleaseModalOpen] = useState(false);
  const [batchReleaseLoading, setBatchReleaseLoading] = useState(false);
  const [batchReleaseError, setBatchReleaseError] = useState<string | null>(null);

  // Real-time ticking timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-open detail popup if navigated back from add-items flow
  useEffect(() => {
    if (!openCardNumber || sessions.length === 0) return;
    const session = sessions.find(
      s => s.card.cardNumber === openCardNumber && !s.actualEndTime && s.status !== 'Hoàn thành'
    );
    if (session) {
      setSelectedSessionForDetail(session);
      // Clear the state so it doesn't re-open on re-render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [openCardNumber, sessions, location.pathname, navigate]);

  // Auto-close success popup after 2.5s
  useEffect(() => {
    if (!releaseSuccessCard) return;
    const t = setTimeout(() => setReleaseSuccessCard(null), 2500);
    return () => clearTimeout(t);
  }, [releaseSuccessCard]);

  // Fetch orders metadata from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pos_orders_metadata');
      let metadata = saved ? JSON.parse(saved) : {};
      
      // Ensure mock data exists for live-demo cards
      const mockMetadata = {
        'ORD-MOCK-04': {
          itemCount: 1,
          items: [
            { name: 'Cà phê đen', sku: 'CF-DEN-01', serveType: 'dine_in', duration: '4h', quantity: 1, price: 35000, note: 'Ít đường' }
          ]
        },
        'ORD-MOCK-08-1': {
          itemCount: 2,
          items: [
            { name: 'Trà sữa truyền thống', sku: 'TS-TRU-02', serveType: 'dine_in', duration: '4h', quantity: 1, price: 35000 },
            { name: 'Bánh gấu', sku: 'AV-BGAU-02', serveType: 'takeaway', duration: 'all_day', quantity: 1, price: 25000 }
          ]
        },
        'ORD-MOCK-08-2': {
          itemCount: 2,
          items: [
            { name: 'Trà sữa đặc sản', sku: 'TS-DAC-01', serveType: 'dine_in', duration: '4h', quantity: 1, price: 35000 },
            { name: 'Bánh que', sku: 'AV-BQUE-03', serveType: 'takeaway', duration: 'all_day', quantity: 1, price: 25000 }
          ]
        },
        'ORD-MOCK-03-1': {
          itemCount: 1,
          items: [
            { name: 'Trà trái cây nhiệt đới', sku: 'TR-NHT-01', serveType: 'dine_in', duration: '4h', quantity: 1, price: 35000 }
          ]
        },
        'ORD-MOCK-03-2': {
          itemCount: 1,
          items: [
            { name: 'Đẹp da', sku: 'NE-DEP-01', serveType: 'dine_in', duration: 'all_day', quantity: 1, price: 45000 }
          ]
        }
      };

      // Merge mock metadata with actual ones
      metadata = { ...mockMetadata, ...metadata };
      localStorage.setItem('pos_orders_metadata', JSON.stringify(metadata));
      setOrdersMetadata(metadata);
    } catch (e) {
      console.error(e);
    }
  }, [cards, sessions]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setErrorMessage(null);
    try {
      const [cardsRes, sessionsRes, productsRes] = await Promise.all([
        cardAPI.getCards(),
        cardAPI.getSessions(),
        productAPI.getProducts().catch(errProd => {
          console.error('Không thể tải sản phẩm:', errProd);
          return null;
        })
      ]);

      if (productsRes?.data) {
        setProductList(productsRes.data.map((p: Record<string, unknown>) => mapPosProduct(p)));
      }

      // Map backend CardStatus enum → frontend status string
      const mapCardStatus = (s: string): string => {
        if (s === 'AVAILABLE') return 'trống';
        if (s === 'IN_USE')    return 'Đang sử dụng';
        if (s === 'DISABLED')  return 'khóa';
        return s;
      };

      // Map backend SessionStatus enum → frontend string
      const mapSessionStatus = (s: string): string => {
        if (s === 'ACTIVE')    return 'Đang sử dụng';
        if (s === 'COMPLETED') return 'Hoàn thành';
        if (s === 'EXPIRED')   return 'Quá giờ';
        return s;
      };

      // Normalize cards: cardCode → cardNumber
      const normalizedCards = cardsRes.data.map((c: any) => ({
        id: c.id,
        cardNumber: c.cardCode ?? c.cardNumber ?? '',
        status: mapCardStatus(c.status),
      }));

      // Normalize sessions: startedAt→startTime, expectedEndAt→endTime, etc.
      const normalizedSessions = sessionsRes.data.map((s: any) => ({
        id: s.id,
        card: {
          id: s.card?.id,
          cardNumber: s.card?.cardCode ?? s.card?.cardNumber ?? '',
          status: mapCardStatus(s.card?.status ?? ''),
        },
        startTime: s.startedAt ?? s.startTime,
        endTime: s.expectedEndAt ?? s.endTime,
        actualEndTime: s.actualEndAt ?? s.actualEndTime ?? null,
        orderId: s.order?.orderCode ?? s.orderId ?? '',
        orderDbId: s.order?.id ? String(s.order.id) : null, // numeric DB id
        status: mapSessionStatus(s.status),
        serviceType: s.serviceType,
      }));

      const sortedCards = [...normalizedCards].sort((a, b) =>
        parseInt(a.cardNumber) - parseInt(b.cardNumber)
      );
      setCards(sortedCards);

      const sortedSessions = [...normalizedSessions].sort((a, b) =>
        parseVNWallDateTime(b.startTime).getTime() - parseVNWallDateTime(a.startTime).getTime()
      );
      setSessions(sortedSessions);
    } catch (err) {
      if (!silent) {
        console.error('Lỗi khi tải dữ liệu thẻ/phiên:', err);
        setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, []);

  // Auto-polling every 10s to sync state changes made by Admin (e.g. Trả thẻ)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchData(true); // silent=true: no loading screen, no error banner
    }, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  // Fetch order items from backend API when detail modal opens
  // This ensures ALL staff can see the item list regardless of who created the order
  useEffect(() => {
    if (!selectedSessionForDetail) {
      setApiDetailItems([]);
      return;
    }
    const dbId = selectedSessionForDetail.orderDbId;
    if (!dbId) {
      setApiDetailItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoadingApiDetail(true);
      try {
        const res = await orderAPI.getOrderById(dbId, { includeTransferProof: false });
        if (cancelled) return;
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        setApiDetailItems(items);
      } catch (err) {
        console.error('Không thể tải chi tiết đơn hàng từ server:', err);
        if (!cancelled) setApiDetailItems([]);
      } finally {
        if (!cancelled) setIsLoadingApiDetail(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSessionForDetail]);

  const handleRelease = (cardNumber: string) => {
    setReleaseConfirmCard(cardNumber);
    setReleaseError(null);
  };

  const handleReleaseConfirmed = async () => {
    if (!releaseConfirmCard) return;
    setReleaseLoading(true);
    setReleaseError(null);
    setSelectedSessionForDetail(null); // Đóng ngay popup chi tiết
    try {
      await cardAPI.releaseCard(releaseConfirmCard);
      // Update state locally - no full reload
      setCards(prev => prev.map(c =>
        c.cardNumber === releaseConfirmCard ? { ...c, status: 'trống' } : c
      ));
      setSessions(prev => prev.map(s =>
        s.card.cardNumber === releaseConfirmCard && !s.actualEndTime
          ? { ...s, actualEndTime: new Date().toISOString(), status: 'Hoàn thành' }
          : s
      ));
      
      // Sync pos_order_history status to Hoàn thành
      const savedHistory = localStorage.getItem('pos_order_history');
      if (savedHistory) {
        const orderHistory = JSON.parse(savedHistory);
        const updatedHistory = orderHistory.map((order: any) => 
          order.cardNumber === releaseConfirmCard && order.status === 'Đang dùng'
            ? { ...order, status: 'Hoàn thành' }
            : order
        );
        localStorage.setItem('pos_order_history', JSON.stringify(updatedHistory));
      }
      setReleaseConfirmCard(null);
      setReleaseSuccessCard(releaseConfirmCard);
    } catch (err) {
      console.error(err);
      setReleaseError('Không thể thực hiện trả thẻ. Vui lòng thử lại.');
    } finally {
      setReleaseLoading(false);
    }
  };

  const toggleCardSelection = (cardNumber: string) => {
    setSelectedCardsForBatch(prev => 
      prev.includes(cardNumber)
        ? prev.filter(c => c !== cardNumber)
        : [...prev, cardNumber]
    );
  };

  const handleBatchReleaseConfirmed = async () => {
    if (selectedCardsForBatch.length === 0) return;
    setBatchReleaseLoading(true);
    setBatchReleaseError(null);
    try {
      // Release multiple cards sequentially or via Promise.all
      await Promise.all(selectedCardsForBatch.map(cardNumber => cardAPI.releaseCard(cardNumber)));
      
      // Update states locally
      setCards(prev => prev.map(c => 
        selectedCardsForBatch.includes(c.cardNumber) ? { ...c, status: 'trống' } : c
      ));
      setSessions(prev => prev.map(s => 
        selectedCardsForBatch.includes(s.card.cardNumber) && !s.actualEndTime
          ? { ...s, actualEndTime: new Date().toISOString(), status: 'Hoàn thành' }
          : s
      ));

      // Sync pos_order_history status to Hoàn thành
      const savedHistory = localStorage.getItem('pos_order_history');
      if (savedHistory) {
        const orderHistory = JSON.parse(savedHistory);
        const updatedHistory = orderHistory.map((order: any) => 
          selectedCardsForBatch.includes(order.cardNumber) && order.status === 'Đang dùng'
            ? { ...order, status: 'Hoàn thành' }
            : order
        );
        localStorage.setItem('pos_order_history', JSON.stringify(updatedHistory));
      }

      setIsBatchReleaseModalOpen(false);
      setSelectedCardsForBatch([]);
      setIsMultiSelectMode(false);
      setReleaseSuccessCard(`${selectedCardsForBatch.length} thẻ`); // Reuse success modal
    } catch (err) {
      console.error(err);
      setBatchReleaseError('Lỗi khi trả một số thẻ. Vui lòng thử lại.');
    } finally {
      setBatchReleaseLoading(false);
    }
  };

  const handleToggleLock = async (card: Card) => {
    const newStatus = card.status === 'khóa' ? 'trống' : 'khóa';
    try {
      await cardAPI.updateCardStatus(card.cardNumber, newStatus);
      alert(`Đã ${newStatus === 'khóa' ? 'Khóa' : 'Mở khóa'} thẻ số ${card.cardNumber}!`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Không thể cập nhật trạng thái khóa thẻ.');
    }
  };

  // Filter logic
  const filteredCards = cards.filter(card => {
    // 1. Search Query filter (by card number)
    if (searchQuery && !card.cardNumber.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Find active session
    const activeSession = sessions.find(
      s => s.card.cardNumber === card.cardNumber &&
           s.status !== 'Hoàn thành' &&
           !s.actualEndTime
    );

    // 2. Tab Filter
    if (selectedFilter === 'all') return true;

    if (!activeSession) {
      return false;
    }

    const durationType = resolveSessionDurationType(activeSession);
    const display = getTableCardDisplay(activeSession, currentTime);

    if (selectedFilter === '4h') {
      return durationType === '4h';
    }
    if (selectedFilter === 'all_day') {
      return durationType === 'all_day';
    }
    if (selectedFilter === 'near_overdue') {
      return display.isOverdue || display.isNearOverdue;
    }

    return true;
  });

  // Sort logic based on status priority: Overdue (Red) > Near Overdue (Yellow) > In Use (Green) > Free (Grey) > Locked (Grey)
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

    if (card.status === 'khóa') return 5; // Khóa (Grey)
    return 4; // Trống (Grey)
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
    <div className="pos-tables-page">
      {/* Centered Header with subtitle/action */}
      <div className="tables-header-centered">
        <div style={{ width: '36px' }}></div>
        <h1 className="tables-title-text">Bàn</h1>
        <button className="btn-refresh-subtle" onClick={() => fetchData(false)} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      {errorMessage && (
        <div className="tables-alert-warning">
          {errorMessage}
        </div>
      )}

      {/* Search Box & Actions */}
      <div className="tables-search-row">
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
        <button 
          className="btn-multi-select-toggle" 
          onClick={() => {
            setIsMultiSelectMode(!isMultiSelectMode);
            setSelectedCardsForBatch([]);
          }}
          style={{
            padding: '8px 16px',
            borderRadius: '24px',
            border: 'none',
            backgroundColor: '#fff',
            color: isMultiSelectMode ? '#C42326' : '#349409',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            transition: 'all 0.2s'
          }}
        >
          {isMultiSelectMode ? 'Hủy chọn' : 'Chọn nhiều'}
        </button>
      </div>

      {/* Pill Filter Container */}
      <div className="filter-pills-container">
        <div className="filter-pills-scroll">
          <button 
            className={`pill-btn ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('all')}
          >
            Tất cả
          </button>
          <button 
            className={`pill-btn ${selectedFilter === '4h' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('4h')}
          >
            4H
          </button>
          <button 
            className={`pill-btn ${selectedFilter === 'all_day' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('all_day')}
          >
            Cả ngày
          </button>
          <button 
            className={`pill-btn ${selectedFilter === 'near_overdue' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('near_overdue')}
          >
            Sắp hết giờ
          </button>
        </div>
        {/* <button className="pill-arrow-btn">
          <span>&rsaquo;</span>
        </button> */}
      </div>

      {/* Cards Grid */}
      <div className="tables-tab-content">
        {loading ? (
          <div className="no-cards-found">Đang tải dữ liệu...</div>
        ) : sortedCards.length === 0 ? (
          <div className="no-cards-found">Không tìm thấy thẻ bàn nào phù hợp.</div>
        ) : (
          <div className="pos-cards-grid">
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
                
                // Get item count from metadata or decoded orderId
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
                    if (isMultiSelectMode) {
                      if (activeSession) toggleCardSelection(card.cardNumber);
                      return;
                    }
                    if (activeSession) {
                      setSelectedSessionForDetail(activeSession);
                    }
                  }}
                  style={(activeSession || isMultiSelectMode) ? { cursor: 'pointer' } : {}}
                >
                  {/* Card Header Section */}
                  <div className="table-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isMultiSelectMode && activeSession && (
                        <input 
                          type="checkbox" 
                          checked={selectedCardsForBatch.includes(card.cardNumber)}
                          onChange={() => {}} // Handle on parent div
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#256e05' }}
                        />
                      )}
                      <span className="table-card-number">#{card.cardNumber}</span>
                    </div>
                    <span className="table-card-badge-tag">
                      {statusColor === 'overdue' && <AlertTriangle size={10} style={{ marginRight: '2px', display: 'inline', verticalAlign: 'middle' }} />}
                      {badgeText}
                    </span>
                  </div>

                  {/* Card Body Section */}
                  <div className="table-card-body">
                    <div className="table-card-timer">{timerStr}</div>
                    {subText && <div className="table-card-subtext">{subText}</div>}
                    
                    {/* Action Buttons Row */}
                    <div className="table-card-actions">
                      {activeSession ? (
                        <>
                          {durationType === '4h' && (
                            <button 
                              className="card-plus-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/pos/sales', { state: { lockedCardNumber: card.cardNumber, isExtend: true } });
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
                              handleRelease(card.cardNumber);
                            }}
                          >
                            TRẢ THẺ
                          </button>
                        </>
                      ) : statusColor === 'locked' ? (
                        <button 
                          className="card-wide-unlock-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLock(card);
                          }}
                        >
                          MỞ KHÓA
                        </button>
                      ) : (
                        <button 
                          className="card-wide-plus-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/pos/sales', { state: { lockedCardNumber: card.cardNumber, isExtend: false } });
                          }}
                          title="Tạo phiên thẻ mới"
                        >
                          <Plus size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Chi tiết bàn */}
      {selectedSessionForDetail && (
        <div className="tables-modal-overlay" onClick={() => setSelectedSessionForDetail(null)}>
          <div className="tables-detail-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="tables-sheet-header">
              <h2 className="tables-sheet-title" style={{ color: '#349409', fontSize: '24px' }}>#{selectedSessionForDetail.card.cardNumber}</h2>
              <button className="tables-sheet-close" onClick={() => setSelectedSessionForDetail(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="tables-sheet-body">
              <div className="tables-detail-info-grid">
                {/* 
                <div className="tables-info-item">
                  <span className="tables-info-label">Mã đơn:</span>
                  <span className="tables-info-value font-mono" style={{ fontSize: '20px', fontWeight: 800, color: '#349409', letterSpacing: '2px' }}>
                    {ordersMetadata[selectedSessionForDetail.orderId]?.displayId
                      ?? selectedSessionForDetail.orderId.split('-').pop()
                      ?? selectedSessionForDetail.orderId}
                  </span>
                </div>
                */}
                <div className="tables-info-item">
                  <span className="tables-info-label">Ngày:</span>
                  <span className="tables-info-value">
                    {parseVNWallDateTime(selectedSessionForDetail.startTime).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                </div>
                <div className="tables-info-item">
                  <span className="tables-info-label">Giờ vào:</span>
                  <span className="tables-info-value">
                    {parseVNWallDateTime(selectedSessionForDetail.startTime).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {(() => {
                  const is4h = resolveSessionDurationType(selectedSessionForDetail) === '4h';
                  if (!is4h) return null;
                  const display = getTableCardDisplay(selectedSessionForDetail, currentTime);

                  return (
                    <>
                      <div className="tables-info-item">
                        <span className="tables-info-label">Dự kiến ra:</span>
                        <span className="tables-info-value">
                          {parseVNWallDateTime(selectedSessionForDetail.endTime).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}
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
                        {/* <th style={{ width: '30px', textAlign: 'center' }}>STT</th> */}
                        <th>SẢN PHẨM</th>
                        <th style={{ width: '65px', textAlign: 'right' }}>GIÁ</th>
                        <th style={{ width: '30px', textAlign: 'center' }}>SL</th>
                        <th style={{ width: '70px', textAlign: 'right' }}>TỔNG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Priority 1: Items fetched from backend API (shared across all staff)
                        if (isLoadingApiDetail) {
                          return (
                            <tr>
                              <td colSpan={5} className="tables-no-products" style={{ backgroundColor: 'transparent', color: '#888' }}>
                                Đang tải danh sách món...
                              </td>
                            </tr>
                          );
                        }

                        // Map API items (from backend) to display format
                        if (apiDetailItems.length > 0) {
                          return apiDetailItems.map((item: any, index: number) => {
                            const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
                            const qty = Number(item.quantity ?? 1);
                            const svcType = item.serviceType || '';
                            let serveText = 'Tại chỗ';
                            if (svcType === 'TAKEAWAY') serveText = 'Mang đi';
                            else if (svcType === 'FOUR_HOURS' || svcType === 'PACKAGE_4H') serveText = 'Tại chỗ 4 giờ';
                            else if (svcType === 'FULL_DAY' || svcType === 'FULLTIME') serveText = 'Tại chỗ cả ngày';
                            const isPackage4h = svcType === 'FOUR_HOURS' || svcType === 'PACKAGE_4H';
                            const bg = rowBackground(isPackage4h);
                            const cellStyle = { backgroundColor: bg };
                            return (
                              <tr key={item.id ?? index} className={isPackage4h ? 'row-package-4h' : undefined}>
                                <td style={cellStyle}>
                                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#111' }}>{item.productName || item.name}</div>
                                  <div style={{ fontSize: '12px', color: '#333', marginTop: '4px' }}>{serveText}</div>
                                </td>
                                <td style={{ ...cellStyle, textAlign: 'right', fontSize: '13px' }}>{unitPrice.toLocaleString('vi-VN')}đ</td>
                                <td style={{ ...cellStyle, textAlign: 'center', fontSize: '13px' }}>{String(qty).padStart(2, '0')}</td>
                                <td style={{ ...cellStyle, textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>
                                  {(unitPrice * qty).toLocaleString('vi-VN')}đ
                                </td>
                              </tr>
                            );
                          });
                        }

                        // Priority 2: Fallback — decode from orderId or read localStorage cache
                        let items: any[] = decodeOrderIdToItems(selectedSessionForDetail.orderId, productList);
                        if (items.length === 0) {
                          const metadata = ordersMetadata[selectedSessionForDetail.orderId];
                          items = metadata?.items || [];
                        }

                        if (items.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="tables-no-products" style={{ backgroundColor: 'transparent' }}>
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
                    // Use API items first for accurate total
                    if (apiDetailItems.length > 0) {
                      const total = apiDetailItems.reduce((sum: number, item: any) => {
                        const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
                        const qty = Number(item.quantity ?? 1);
                        return sum + unitPrice * qty;
                      }, 0);
                      return total > 0 ? `${total.toLocaleString('vi-VN')}đ` : 'Chưa tính';
                    }
                    // Fallback to localStorage/decoded
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
                {(() => {
                  if (resolveSessionDurationType(selectedSessionForDetail) === '4h') {
                    return (
                      <button 
                        className="tables-btn-checkout"
                        onClick={() => navigate('/pos/sales', { state: { lockedCardNumber: selectedSessionForDetail.card.cardNumber } })}
                        style={{ flex: 1, backgroundColor: '#eef8e6', color: '#349409', border: '1px solid #349409' }}
                      >
                        + THÊM MÓN
                      </button>
                    );
                  }
                  return null;
                })()}
                <button 
                  className="tables-btn-checkout"
                  style={{ flex: 1 }}
                  onClick={() => handleRelease(selectedSessionForDetail.card.cardNumber)}
                >
                  TRẢ THẺ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Release Popup */}
      {releaseConfirmCard && (
        <div className="tables-modal-overlay" onClick={() => setReleaseConfirmCard(null)}>
          <div className="tables-confirm-box" onClick={e => e.stopPropagation()}>
            <h3 className="tables-confirm-title">Xác nhận trả thẻ</h3>
            <p className="tables-confirm-message">
              Bạn có chắc chắn muốn trả thẻ số <strong style={{ color: '#349409' }}>#{releaseConfirmCard}</strong> không?
            </p>
            {releaseError && (
              <p style={{ color: '#d32f2f', fontSize: '13px', textAlign: 'center', margin: '0 0 12px 0' }}>{releaseError}</p>
            )}
            <div className="tables-confirm-actions">
              <button
                className="tables-confirm-cancel"
                onClick={() => setReleaseConfirmCard(null)}
                disabled={releaseLoading}
              >
                HỦY
              </button>
              <button
                className="tables-confirm-ok"
                onClick={handleReleaseConfirmed}
                disabled={releaseLoading}
              >
                {releaseLoading ? 'Đang xử lý...' : 'XÁC NHẬN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Release Popup */}
      {releaseSuccessCard && (
        <div className="tables-modal-overlay" onClick={() => setReleaseSuccessCard(null)}>
          <div className="tables-confirm-box" onClick={e => e.stopPropagation()}>
            <div className="tables-success-icon">✓</div>
            <h3 className="tables-confirm-title" style={{ color: '#349409' }}>Trả thẻ thành công!</h3>
            <p className="tables-confirm-message">
              Thẻ số <strong style={{ color: '#349409' }}>#{releaseSuccessCard}</strong> đã được hoàn trả thành công.
            </p>
            <button
              className="tables-confirm-ok"
              style={{ width: '100%' }}
              onClick={() => setReleaseSuccessCard(null)}
            >
              ĐÓNG
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button for Batch Release */}
      {isMultiSelectMode && selectedCardsForBatch.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '110px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
        }}>
          <button 
            onClick={() => setIsBatchReleaseModalOpen(true)}
            style={{
              backgroundColor: '#256e05',
              color: '#fff',
              border: 'none',
              padding: '12px 24px', 
              borderRadius: '24px',
              fontWeight: 'bold',
              fontSize: '14px', 
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 110, 5, 0.4)'
            }}
          >
            TRẢ {selectedCardsForBatch.length} THẺ
          </button>
        </div>
      )}

      {/* Confirm Batch Release Popup */}
      {isBatchReleaseModalOpen && (
        <div className="tables-modal-overlay" onClick={() => !batchReleaseLoading && setIsBatchReleaseModalOpen(false)}>
          <div className="tables-confirm-box" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
            <h3 className="tables-confirm-title">Xác nhận trả nhiều thẻ</h3>
            <p className="tables-confirm-message" style={{ textAlign: 'left', marginBottom: '8px' }}>
              Bạn chuẩn bị trả <strong style={{ color: '#349409' }}>{selectedCardsForBatch.length}</strong> thẻ sau:
            </p>
            <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '16px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedCardsForBatch.map(num => (
                  <span key={num} style={{ padding: '4px 10px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', fontWeight: 'bold' }}>
                    #{num}
                  </span>
                ))}
              </div>
            </div>
            {batchReleaseError && (
              <p style={{ color: '#d32f2f', fontSize: '13px', textAlign: 'center', margin: '0 0 12px 0' }}>{batchReleaseError}</p>
            )}
            <div className="tables-confirm-actions">
              <button
                className="tables-confirm-cancel"
                onClick={() => setIsBatchReleaseModalOpen(false)}
                disabled={batchReleaseLoading}
              >
                HỦY
              </button>
              <button
                className="tables-confirm-ok"
                onClick={handleBatchReleaseConfirmed}
                disabled={batchReleaseLoading}
              >
                {batchReleaseLoading ? 'Đang xử lý...' : 'XÁC NHẬN'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
