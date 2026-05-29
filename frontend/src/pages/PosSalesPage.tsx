import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, X, Minus, Plus, ChevronLeft, Trash2, Camera } from 'lucide-react';
import { productAPI, cardAPI, orderAPI } from '../services/api';
import arrowWhite from '../../assets/icon/arrow_white.png';
import iconPosDarkgreen from '../../assets/icon/pos_darkgreen.png';
import iconEditGrey from '../../assets/icon/edit_grey.png';
import './PosSalesPage.css';
import CustomSelect from '../components/CustomSelect';
import { mapPosProduct, posUnitPrice, type PosProduct } from '../utils/posProduct';

type Product = PosProduct;

export interface CartItem {
  id: string; // unique id for each item in cart
  product: Product;
  serveType: 'takeaway' | 'dine_in';
  duration: '4h' | 'all_day';
  quantity: number;
  note: string;
  price: number;
}

export interface TempEditItem {
  id: string;
  product: Product;
  serveType: 'takeaway' | 'dine_in';
  duration: '4h' | 'all_day';
  note: string;
}

export interface BackendCard {
  id: number;
  cardNumber: string;
  status: string;
}

function mapCartItemsForApi(items: CartItem[]) {
  return items.map((item) => ({
    id: String(item.product.id),
    productId: String(item.product.id),
    quantity: item.quantity,
    price: item.price,
    note: item.note || '',
    serveType: item.serveType,
    duration: item.duration,
  }));
}

export default function PosSalesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['Tất cả']);
  const [loading, setLoading] = useState(true);

  // States cho Giỏ hàng (Đơn hàng)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const discountPercent = 0;
  const [isEditAllOpen, setIsEditAllOpen] = useState(false);
  const [editAllItems, setEditAllItems] = useState<TempEditItem[]>([]);

  // States cho Thanh toán
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [cashInput, setCashInput] = useState('0');
  const [paymentImage, setPaymentImage] = useState<string | null>(null);

  // States cho Chọn thẻ
  const [isCardSelectionOpen, setIsCardSelectionOpen] = useState(false);
  const [freeCards, setFreeCards] = useState<BackendCard[]>([]);
  
  const location = useLocation();
  const lockedCardNumber = location.state?.lockedCardNumber as string | undefined;
  const isExtend = (location.state?.isExtend as boolean | undefined) ?? (lockedCardNumber ? true : undefined);
  
  const [selectedCardNumber, setSelectedCardNumber] = useState<string | null>(lockedCardNumber || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State cho Popup xác nhận xóa
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    message: string;
    onConfirm: () => void;
  }>({ open: false, message: '', onConfirm: () => {} });

  // State cho Popup thông báo thành công
  const [successDialog, setSuccessDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    displayId?: string;
  }>({ open: false, title: '', message: '' });

  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: '', message: '' });

  // State cho Popup hết thẻ
  const [noCardDialog, setNoCardDialog] = useState(false);

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, message, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, open: false }));
  };

  const handleConfirmOk = () => {
    confirmDialog.onConfirm();
    closeConfirm();
  };

  // States cho Popup Chi tiết món
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [serveType, setServeType] = useState<'takeaway' | 'dine_in'>('takeaway');
  const [duration, setDuration] = useState<'4h' | 'all_day'>('4h');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  // Giá POS lấy từ 3 cột giá bảng products (API đã trả giá hiệu lực)
  const calculatePrice = () => {
    if (!selectedProduct) return 0;
    return posUnitPrice(selectedProduct, serveType, duration);
  };

  // Mở popup
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setServeType('takeaway');
    setDuration('4h');
    setQuantity(1);
    setNote('');
  };

  // Đóng popup
  const closePopup = () => {
    setSelectedProduct(null);
    setEditingCartItemId(null);
  };

  // Mở popup để điều chỉnh món trong giỏ
  const handleEditCartItem = (item: CartItem) => {
    setEditingCartItemId(item.id);
    setSelectedProduct(item.product);
    setServeType(item.serveType);
    setDuration(item.duration);
    setQuantity(item.quantity);
    setNote(item.note);
  };

  // Lưu món đã điều chỉnh
  const handleSaveEditedItem = () => {
    if (!editingCartItemId) return;
    
    if (!lockedCardNumber && serveType === 'dine_in' && freeCards.length === 0) {
      setNoCardDialog(true);
      return;
    }

    if (selectedProduct && quantity > (selectedProduct.currentStock || 0)) {
      alert(`Số lượng không được vượt quá tồn kho hiện tại (${selectedProduct.currentStock || 0})`);
      return;
    }

    setCartItems(prev => prev.map(item => {
      if (item.id === editingCartItemId) {
        return {
          ...item,
          serveType,
          duration,
          quantity,
          note,
          price: calculatePrice()
        };
      }
      return item;
    }));
    closePopup();
  };

  // Mở popup điều chỉnh tất cả các món
  const handleOpenEditAll = () => {
    const tempItems: TempEditItem[] = [];
    cartItems.forEach((item, itemIdx) => {
      // Split each item by its quantity
      for (let i = 0; i < item.quantity; i++) {
        tempItems.push({
          id: `${item.id}_${itemIdx}_${i}`,
          product: item.product,
          serveType: item.serveType,
          duration: item.duration,
          note: item.note,
        });
      }
    });
    setEditAllItems(tempItems);
    setIsEditAllOpen(true);
  };

  // Thay đổi cấu hình của từng món trong popup chỉnh sửa hàng loạt
  const handleEditAllChange = (id: string, field: 'serveType' | 'duration', value: any) => {
    setEditAllItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Lưu cấu hình chỉnh sửa hàng loạt
  const handleSaveEditAll = () => {
    const hasDineIn = editAllItems.some(item => item.serveType === 'dine_in');
    if (!lockedCardNumber && hasDineIn && freeCards.length === 0) {
      setNoCardDialog(true);
      return;
    }

    const merged: CartItem[] = [];
    editAllItems.forEach(item => {
      // Find if there's an identical item in the merged array
      const existing = merged.find(m =>
        m.product.id === item.product.id &&
        m.serveType === item.serveType &&
        m.duration === item.duration &&
        m.note === item.note
      );

      const getPriceForItem = (p: typeof item) => posUnitPrice(p.product, p.serveType, p.duration);

      if (existing) {
        existing.quantity += 1;
        existing.price = getPriceForItem(existing);
      } else {
        merged.push({
          id: item.id,
          product: item.product,
          serveType: item.serveType,
          duration: item.duration,
          quantity: 1,
          note: item.note,
          price: getPriceForItem(item)
        });
      }
    });

    setCartItems(merged);
    setIsEditAllOpen(false);
  };

  // Thêm vào giỏ hàng
  const handleAddToCart = (openCart: boolean) => {
    if (!selectedProduct) return;
    
    if (!lockedCardNumber && serveType === 'dine_in' && freeCards.length === 0) {
      setNoCardDialog(true);
      return;
    }

    const currentStock = selectedProduct.currentStock || 0;
    if (quantity > currentStock) {
      alert(`Số lượng không được vượt quá tồn kho hiện tại (${currentStock})`);
      return;
    }

    const newItem: CartItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      product: selectedProduct,
      serveType,
      duration,
      quantity,
      note,
      price: calculatePrice(),
    };
    
    setCartItems(prev => [...prev, newItem]);
    closePopup();
    
    if (openCart) {
      setIsCartOpen(true);
    }
  };

  // Cập nhật số lượng trong giỏ hàng
  const updateCartItemQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const currentStock = item.product.currentStock || 0;
        let newQuantity = item.quantity + delta;
        if (delta > 0 && newQuantity > currentStock) {
          setErrorDialog({ open: true, title: 'Cảnh báo', message: `Sản phẩm ${item.product.name} chỉ còn ${currentStock}` });
          newQuantity = currentStock;
        } else {
          newQuantity = Math.max(1, newQuantity);
        }
        const basePrice = posUnitPrice(item.product, item.serveType, item.duration);
        return { ...item, quantity: newQuantity, price: basePrice };
      }
      return item;
    }));
  };

  // Xóa món khỏi giỏ hàng
  const handleRemoveCartItem = (id: string) => {
    showConfirm('Bạn có chắc muốn xóa món này khỏi đơn hàng?', () => {
      setCartItems(prev => prev.filter(item => item.id !== id));
    });
  };

  // Xóa toàn bộ đơn hàng
  const handleClearCart = () => {
    showConfirm('Bạn có chắc muốn hủy toàn bộ đơn hàng này?', () => {
      setCartItems([]);
      setIsCartOpen(false);
    });
  };

  // Hoàn tất thanh toán -> Mở màn hình chọn thẻ
  const handleCompletePayment = async () => {
    if (!lockedCardNumber) {
      // Only fetch free cards when no card is pre-locked
      try {
        const res = await cardAPI.getFreeCards();
        const mappedCards = res.data.map((c: any) => ({
          id: c.id,
          cardNumber: c.cardCode,
          status: c.status
        }));
        const sortedCards = mappedCards.sort((a: any, b: any) => parseInt(a.cardNumber) - parseInt(b.cardNumber));
        setFreeCards(sortedCards);
      } catch (err) {
        console.error("Không thể tải danh sách thẻ trống:", err);
        setFreeCards([]);
      }
    }
    setSelectedCardNumber(lockedCardNumber || null);
    setIsCardSelectionOpen(true);
    setIsCheckoutOpen(false);
  };

  // Chọn thẻ và kết thúc
  const handleSelectCardSelection = async () => {
    if (!selectedCardNumber) {
      alert('Vui lòng chọn một thẻ!');
      return;
    }
    
    setIsSubmitting(true);

    // Check if there is any 4h duration in cart items
    const has4h = cartItems.some(item => item.serveType === 'dine_in' && item.duration === '4h');
    const duration = has4h ? '4h' : 'all_day';

    // Lấy mã đơn từ backend
    let orderId = `FALLBACK-${Date.now()}`;
    let displayId = orderId;
    try {
      const orderRes = await orderAPI.getNextId();
      orderId = orderRes.data.orderId;     // VD: HCM01-260522-0001
      displayId = orderRes.data.displayId; // VD: 0001
    } catch (err) {
      console.error('Không thể lấy mã đơn từ backend, dùng fallback:', err);
    }

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const actualCashReceived = paymentMethod === 'cash' ? (parseInt(cashInput) || 0) : 0;

    try {
      await cardAPI.startSession({
        cardNumber: selectedCardNumber,
        orderId: orderId,
        duration: duration,
        paymentMethod: paymentMethod === 'cash' ? 'cash' : 'transfer',
        paymentAmount: finalTotal,
        cashReceived: actualCashReceived,
        paymentImage: paymentMethod === 'transfer' ? paymentImage : null,
        items: mapCartItemsForApi(cartItems),
      });
      // Save metadata to LocalStorage for fallback
      const savedMetadata = localStorage.getItem('pos_orders_metadata');
      const metadata = savedMetadata ? JSON.parse(savedMetadata) : {};
      metadata[orderId] = {
        itemCount: totalItems,
        displayId: displayId,
        creator: localStorage.getItem('staffEmail') || 'Unknown',
        initial4hCount: cartItems.filter(i => i.duration === '4h' && i.serveType === 'dine_in').reduce((sum, i) => sum + i.quantity, 0),
        items: cartItems.map(item => ({
          name: item.product.name,
          sku: item.product.sku,
          serveType: item.serveType,
          duration: item.duration,
          quantity: item.quantity,
          price: item.price,
          note: item.note
        }))
      };
      localStorage.setItem('pos_orders_metadata', JSON.stringify(metadata));

      // Save to pos_order_history for separated order history view
      const savedHistory = localStorage.getItem('pos_order_history');
      const orderHistory = savedHistory ? JSON.parse(savedHistory) : [];
      orderHistory.push({
        id: orderId,
        displayId: displayId,
        parentOrderId: orderId,
        cardNumber: selectedCardNumber,
        items: metadata[orderId].items,
        totalAmount: cartItems.reduce((sum, i) => sum + (i.price * i.quantity), 0),
        paymentMethod: paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản',
        status: cartItems.every(i => i.serveType === 'takeaway') ? 'Hoàn thành' : 'Đang dùng',
        createdAt: new Date().toISOString(),
        creator: localStorage.getItem('staffEmail') || 'Unknown'
      });
      localStorage.setItem('pos_order_history', JSON.stringify(orderHistory));
    } catch (err: any) {
      console.error('Lỗi khi tạo phiên thẻ:', err);
      const errMsg = err.response?.data?.message || 'Không thể tạo phiên thẻ. Vui lòng thử lại.';
      alert(errMsg);
      setIsSubmitting(false);
      return;
    }
    setSuccessDialog({
      open: true,
      title: 'Tạo Đơn Thành Công!',
      message: `Đơn hàng đã được thanh toán. Bắt đầu phiên thẻ số ${selectedCardNumber}.`,
      displayId: displayId
    });
    setCartItems([]);
    setIsCardSelectionOpen(false);
    setIsCartOpen(false);
    if (lockedCardNumber) {
      navigate('/pos/tables', { state: { openCardNumber: lockedCardNumber } });
    }
  };

  // Bỏ qua chọn thẻ và kết thúc
  const handleSkipCardSelection = async () => {
    if (lockedCardNumber) {
      setIsSubmitting(true);
      try {
        // Find active session for this card - raw API uses card.cardCode and status as enum string
        const sessionsRes = await cardAPI.getSessions();
        const activeSession = sessionsRes.data.find((s: any) =>
          (s.card?.cardCode === lockedCardNumber || s.card?.cardNumber === lockedCardNumber) &&
          !s.actualEndAt &&
          s.status === 'ACTIVE'
        );
        
        if (activeSession) {
          const savedMetadata = localStorage.getItem('pos_orders_metadata');
          const metadata = savedMetadata ? JSON.parse(savedMetadata) : {};
          // Raw API: field is order.orderCode, not orderId
          const orderId = activeSession.order?.orderCode ?? activeSession.orderId ?? '';
          const orderMetadata = metadata[orderId] || {};
          const originalItems = orderMetadata.items || [];
          
          let initial4hCount = orderMetadata.initial4hCount;
          if (initial4hCount === undefined) {
             initial4hCount = originalItems
                .filter((i: any) => i.duration === '4h' && i.serveType === 'dine_in')
                .reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
          }

          // Raw API: field is expectedEndAt, not endTime
          const rawEndTime = activeSession.expectedEndAt ?? activeSession.endTime ?? '';
          let currentEndTime = new Date(rawEndTime);
          // If no timezone suffix, treat as local time
          if (rawEndTime && !rawEndTime.endsWith('Z') && !/([+-]\d{2}:\d{2})$/.test(rawEndTime)) {
            const m = rawEndTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
            if (m) {
              currentEndTime = new Date(
                parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]),
                parseInt(m[4]), parseInt(m[5]), parseInt(m[6])
              );
            }
          }
          // Fallback: if currentEndTime is invalid or in the past, use now
          if (isNaN(currentEndTime.getTime()) || currentEndTime.getTime() < Date.now()) {
            currentEndTime = new Date();
          }
          
          const new4hCount = cartItems
            .filter(i => i.duration === '4h' && i.serveType === 'dine_in')
            .reduce((sum, i) => sum + i.quantity, 0);
            
          const newAllDayCount = cartItems
            .filter(i => i.duration === 'all_day' && i.serveType === 'dine_in')
            .reduce((sum, i) => sum + i.quantity, 0);
            
          let extendTime = false;
          let newEndTime = currentEndTime;
          let upgradeToAllDay = false;

          if (newAllDayCount > 0) {
            // Upgrade to all_day: set end time to 22:00 today
            newEndTime = new Date();
            newEndTime.setHours(22, 0, 0, 0);
            extendTime = true;
            upgradeToAllDay = true;
          } else if (new4hCount > 0) {
            // Add 4 hours to the REMAINING time (not from now)
            newEndTime = new Date(newEndTime.getTime() + 4 * 60 * 60 * 1000);
            extendTime = true;
          }

          if (extendTime) {
            const pad = (n: number) => n.toString().padStart(2, '0');
            const formattedDate = `${newEndTime.getFullYear()}-${pad(newEndTime.getMonth() + 1)}-${pad(newEndTime.getDate())}T${pad(newEndTime.getHours())}:${pad(newEndTime.getMinutes())}:${pad(newEndTime.getSeconds())}`;
            const extendServiceType = upgradeToAllDay
              ? 'all_day'
              : new4hCount > 0
                ? '4h'
                : undefined;
            await cardAPI.extendSession(lockedCardNumber, formattedDate, extendServiceType);
          }

          if (cartItems.length > 0 && orderId) {
            const actualCashReceived = paymentMethod === 'cash' ? (parseInt(cashInput) || 0) : 0;
            await orderAPI.appendItems({
              orderCode: orderId,
              paymentMethod: paymentMethod === 'cash' ? 'cash' : 'transfer',
              paymentAmount: finalTotal,
              cashReceived: actualCashReceived,
              paymentImage: paymentMethod === 'transfer' ? paymentImage : null,
              items: mapCartItemsForApi(cartItems),
            });
          }

          // Append items to metadata
          const formattedCartItems = cartItems.map(item => ({
            name: item.product.name,
            sku: item.product.sku,
            serveType: item.serveType,
            duration: item.duration,
            quantity: item.quantity,
            price: item.price,
            note: item.note
          }));

          if (!metadata[orderId]) {
             metadata[orderId] = { itemCount: 0, items: [], creator: localStorage.getItem('staffEmail') || 'Unknown' };
          }
          metadata[orderId].items = [...originalItems, ...formattedCartItems];
          metadata[orderId].itemCount = metadata[orderId].items.reduce((sum: number, i: any) => sum + i.quantity, 0);
          
          localStorage.setItem('pos_orders_metadata', JSON.stringify(metadata));

          // Save sub-order to pos_order_history
          const savedHistory = localStorage.getItem('pos_order_history');
          const orderHistory = savedHistory ? JSON.parse(savedHistory) : [];
          
          let subOrderId = `${orderId}-${Date.now().toString().slice(-4)}`;
          let displaySubId = subOrderId.split('-').pop() || '';
          try {
            const subOrderRes = await orderAPI.getNextId();
            subOrderId = subOrderRes.data.orderId;
            displaySubId = subOrderRes.data.displayId;
          } catch (err) {
            console.error('Không thể lấy mã đơn phụ từ backend, dùng fallback:', err);
          }
          
          orderHistory.push({
            id: subOrderId,
            displayId: displaySubId,
            parentOrderId: orderId,
            cardNumber: lockedCardNumber,
            items: formattedCartItems,
            totalAmount: cartItems.reduce((sum, i) => sum + (i.price * i.quantity), 0),
            paymentMethod: paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản',
            status: 'Đang dùng',
            createdAt: new Date().toISOString(),
            creator: localStorage.getItem('staffEmail') || 'Unknown'
          });
          localStorage.setItem('pos_order_history', JSON.stringify(orderHistory));
        }
      } catch (e) {
        console.error("Lỗi khi cập nhật thời gian / thêm món:", e);
      } finally {
        setIsSubmitting(false);
      }
      
      setCartItems([]);
      setIsCardSelectionOpen(false);
      setIsCartOpen(false);
      navigate('/pos/tables', { state: { openCardNumber: lockedCardNumber } });
    } else {
      setIsSubmitting(true);
      // Create a standalone takeaway order in history
      const savedHistory = localStorage.getItem('pos_order_history');
      const orderHistory = savedHistory ? JSON.parse(savedHistory) : [];
      
      let taOrderId = `HCM01-TA-${Date.now().toString().slice(-6)}`;
      let displayTaId = taOrderId.split('-').pop() || '';
      try {
        const taOrderRes = await orderAPI.getNextId();
        taOrderId = taOrderRes.data.orderId;
        displayTaId = taOrderRes.data.displayId;
      } catch (err) {
        console.error('Không thể lấy mã đơn mang đi từ backend, dùng fallback:', err);
      }
      
      try {
        const actualCashReceived = paymentMethod === 'cash' ? (parseInt(cashInput) || 0) : 0;
        await orderAPI.createTakeaway({
          orderId: taOrderId,
          paymentMethod: paymentMethod === 'cash' ? 'cash' : 'transfer',
          paymentAmount: finalTotal,
          cashReceived: actualCashReceived,
          paymentImage: paymentMethod === 'transfer' ? paymentImage : null,
          items: mapCartItemsForApi(cartItems),
        });
      } catch (err: any) {
        console.error('Lỗi khi tạo đơn mang đi trên backend:', err);
        const errMsg = err.response?.data?.message || 'Không thể tạo đơn mang đi. Vui lòng thử lại.';
        alert(errMsg);
        setIsSubmitting(false);
        return;
      }
      
      orderHistory.push({
        id: taOrderId,
        displayId: displayTaId,
        parentOrderId: null,
        cardNumber: 'Mang đi',
        items: cartItems.map(item => ({
          name: item.product.name,
          sku: item.product.sku,
          serveType: item.serveType,
          duration: item.duration,
          quantity: item.quantity,
          price: item.price,
          note: item.note
        })),
        totalAmount: cartItems.reduce((sum, i) => sum + (i.price * i.quantity), 0),
        paymentMethod: paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản',
        status: 'Hoàn thành',
        createdAt: new Date().toISOString(),
        creator: localStorage.getItem('staffEmail') || 'Unknown'
      });
      localStorage.setItem('pos_order_history', JSON.stringify(orderHistory));

      setCartItems([]);
      setIsCardSelectionOpen(false);
      setIsCartOpen(false);
      setIsSubmitting(false);
      setSuccessDialog({
        open: true,
        title: 'Tạo Đơn Thành Công!',
        message: 'Đơn hàng mang đi đã được ghi nhận và thanh toán.',
        displayId: displayTaId
      });
    }
  };

  // Nhấn bàn phím số
  const handleKeypadPress = (val: string) => {
    setCashInput(prev => {
      if (val === 'C') {
        return '0';
      }
      if (val === 'backspace') {
        if (prev.length <= 1) return '0';
        return prev.slice(0, -1);
      }
      if (val === '000') {
        if (prev === '0') return '0';
        return prev + '000';
      }
      if (val === '0') {
        if (prev === '0') return '0';
        return prev + '0';
      }
      if (prev === '0') return val;
      return prev + val;
    });
  };

  // Chụp hoặc tải ảnh minh chứng chuyển khoản
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await productAPI.getProducts();
        const data: Product[] = res.data.map((p: Record<string, unknown>) => mapPosProduct(p));
        setProducts(data);
        const cats = ['Tất cả', ...Array.from(new Set(data.map(p => p.categoryName)))];
        setCategories(cats);

        if (!lockedCardNumber) {
          const cardsRes = await cardAPI.getFreeCards();
          setFreeCards(cardsRes.data || []);
        }
      } catch (err) {
        console.error('Không thể tải danh sách sản phẩm hoặc thẻ:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [lockedCardNumber]);

  const filteredProducts = products.filter(p => {
    const matchCategory = selectedCategory === 'Tất cả' || p.categoryName === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch && p.isActive !== false;
  });

  // Tạo chữ viết tắt từ tên sản phẩm (tối đa 2 chữ cái đầu của từ)
  const getInitials = (name: string) => {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };



  const tempTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = (tempTotal * discountPercent) / 100;
  const finalTotal = tempTotal - discountAmount;

  const has4h = cartItems.some(item => item.serveType === 'dine_in' && item.duration === '4h');
  const hasAllDay = cartItems.some(item => item.serveType === 'dine_in' && item.duration === 'all_day');
  const isTakeawayOnly = cartItems.length > 0 && cartItems.every(item => item.serveType === 'takeaway');

  return (
    <div className="pos-sales-page">
      <div className="pos-top-section">
        {/* Header */}
        <div className="pos-header">
          <h1 className="pos-title">Bán hàng</h1>
          <div 
            className="pos-register-icon" 
            onClick={() => cartItems.length > 0 && setIsCartOpen(true)} 
            style={{ cursor: cartItems.length > 0 ? 'pointer' : 'default' }}
          >
            <img src={iconPosDarkgreen} alt="Cart" style={{ width: 20, height: 20, objectFit: 'contain' }} />
            {cartItems.length > 0 && (
              <span className="pos-badge">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="pos-search-container">
          <div className="pos-search-box">
            <Search size={20} color="#a0a0a0" />
            <input 
              type="text" 
              placeholder="Tìm kiếm..." 
              className="pos-search-input" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="pos-search-clear-btn" 
                onClick={() => setSearchQuery('')}
              >
                <X size={16} color="#a0a0a0" />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="pos-categories">
          {categories.map((cat, idx) => (
            <button 
              key={idx} 
              className={`pos-cat-btn ${cat === selectedCategory ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="pos-product-grid-scroll">
        {loading ? (
          <div className="pos-loading">Đang tải sản phẩm...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="pos-empty">Không tìm thấy sản phẩm nào.</div>
        ) : (
          <div className="pos-product-grid">
            {filteredProducts.map(product => {
              const isOutOfStock = product.currentStock <= 0;
              return (
                <div 
                  key={product.id} 
                  className={`pos-product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                  onClick={() => {
                    if (!isOutOfStock) handleProductClick(product);
                  }}
                >
                  <div 
                    className="pos-product-img"
                    style={!product.imageUrl ? { backgroundColor: 'rgba(192, 192, 192, 1)' } : {}}
                  >
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span className="pos-product-initials">{getInitials(product.name)}</span>
                    )}
                    {isOutOfStock && (
                      <div className="pos-out-of-stock-overlay">Hết hàng</div>
                    )}
                  </div>
                  <div className="pos-product-info">
                    <div>{product.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Detail Bottom Sheet */}
      {selectedProduct && (
        <div className="pos-modal-overlay">
          <div className="pos-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="pos-sheet-header">
              <h2 className="pos-sheet-title">{editingCartItemId ? 'Điều chỉnh chi tiết món' : 'Chi tiết món'}</h2>
              <button className="pos-sheet-close" onClick={closePopup}>
                <X size={24} color="#111" />
              </button>
            </div>

            <div className="pos-sheet-body">
              {/* Product Info & Quantity */}
              <div className="pos-sheet-product-info">
                <div 
                  className="pos-sheet-img"
                  style={!selectedProduct.imageUrl ? { backgroundColor: 'rgb(121, 85, 72)' } : {}}
                >
                  {selectedProduct.imageUrl ? (
                    <img src={selectedProduct.imageUrl} alt={selectedProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span className="pos-product-initials">{getInitials(selectedProduct.name)}</span>
                  )}
                </div>
                <div className="pos-sheet-product-details">
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#111' }}>{selectedProduct.name}</div>
                </div>
                
                {/* Quantity Control moved here */}
                <div className="pos-quantity-control">
                  <button 
                    className="pos-quantity-btn" 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus size={14} color={quantity <= 1 ? 'rgba(255,255,255,0.5)' : '#fff'} />
                  </button>
                  <span className="pos-quantity-text">{quantity}</span>
                  <button 
                    className="pos-quantity-btn"
                    onClick={() => {
                      const maxStock = selectedProduct.currentStock || 0;
                      if (quantity >= maxStock) {
                        setErrorDialog({ open: true, title: 'Cảnh báo', message: `Sản phẩm ${selectedProduct.name} chỉ còn ${maxStock}` });
                      } else {
                        setQuantity(quantity + 1);
                      }
                    }}
                    style={{ opacity: quantity >= (selectedProduct.currentStock || 0) ? 0.5 : 1 }}
                  >
                    <Plus size={14} color="#fff" />
                  </button>
                </div>
              </div>

              {/* Serve Type */}
              <div className="pos-sheet-section">
                <h3 className="pos-sheet-section-title">Hình thức phục vụ</h3>
                <div className="pos-sheet-options">
                  <button 
                    className={`pos-option-btn ${serveType === 'takeaway' ? 'active' : ''}`}
                    onClick={() => setServeType('takeaway')}
                  >
                    Mang đi
                  </button>
                  <button 
                    className={`pos-option-btn ${serveType === 'dine_in' ? 'active' : ''}`}
                    onClick={() => setServeType('dine_in')}
                  >
                    Tại chỗ
                  </button>
                </div>
              </div>

              {/* Duration (Only show if dine_in) */}
              {serveType === 'dine_in' && (
                <div className="pos-sheet-section">
                  <h3 className="pos-sheet-section-title">Thời gian</h3>
                  <div className="pos-sheet-options">
                    <button 
                      className={`pos-option-btn ${duration === '4h' ? 'active' : ''}`}
                      onClick={() => setDuration('4h')}
                    >
                      4 giờ
                    </button>
                    <button 
                      className={`pos-option-btn ${duration === 'all_day' ? 'active' : ''}`}
                      onClick={() => setDuration('all_day')}
                    >
                      Cả ngày
                    </button>
                  </div>
                </div>
              )}

              {/* Note */}
              <div className="pos-sheet-section">
                <h3 className="pos-sheet-section-title">Ghi chú</h3>
                <textarea 
                  className="pos-sheet-textarea" 
                  placeholder="Ghi chú thêm (ít đá, nhiều đường...)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
              </div>


            </div>

            {/* Footer */}
            <div className="pos-sheet-footer">
              <div className="pos-sheet-total">
                <span>Tổng tiền:</span>
                <span className="pos-sheet-price">{calculatePrice().toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="pos-sheet-actions">
                {editingCartItemId ? (
                  <button className="pos-sheet-btn-solid" style={{ width: '100%' }} onClick={handleSaveEditedItem}>
                    LƯU
                  </button>
                ) : (
                  <>
                    <button className="pos-sheet-btn-outline" onClick={() => handleAddToCart(false)}>
                      MUA TIẾP
                    </button>
                    <button className="pos-sheet-btn-solid" onClick={() => handleAddToCart(true)}>
                      XONG
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart View Overlay */}
      {isCartOpen && (
        <div className="pos-cart-overlay">
          <div className="pos-cart-container">
            {/* Header */}
            <div className="pos-cart-header">
              <button className="pos-cart-back-btn" onClick={() => setIsCartOpen(false)}>
                <ChevronLeft size={24} color="#555" />
              </button>
              <h2 className="pos-cart-title">Đơn hàng</h2>
              <div className="pos-cart-header-actions">
                <button className="pos-cart-action-btn" onClick={handleOpenEditAll}>
                  <img src={iconEditGrey} alt="Sửa" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                </button>
                <button className="pos-cart-action-btn" onClick={handleClearCart}>
                  <X size={24} color="#d32f2f" />
                </button>
              </div>
            </div>

            {/* Cart Items */}
            <div className="pos-cart-body">
              {cartItems.length === 0 ? (
                <div className="pos-empty" style={{ marginTop: '100px' }}>Giỏ hàng đang trống.</div>
              ) : (
                <div className="pos-cart-list">
                  {cartItems.map((item) => (
                    <div key={item.id} className="pos-cart-item">
                      <div className="pos-cart-item-img">
                        {item.product.imageUrl ? (
                          <img src={item.product.imageUrl} alt={item.product.name} />
                        ) : (
                          <div style={{ backgroundColor: 'rgb(121, 85, 72)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="pos-product-initials" style={{ fontSize: '20px' }}>{getInitials(item.product.name)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="pos-cart-item-details">
                        <div className="pos-cart-item-header">
                          <h4 className="pos-cart-item-name">{item.product.name}</h4>
                          <button className="pos-cart-item-edit-btn" onClick={() => handleEditCartItem(item)}>
                            <img src={iconEditGrey} alt="Sửa" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                          </button>
                        </div>
                        
                        <div className="pos-cart-item-price">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</div>
                        
                        <div className="pos-cart-item-actions">
                          <div className="pos-quantity-control">
                            <button 
                              className="pos-quantity-btn" 
                              onClick={() => updateCartItemQuantity(item.id, -1)}
                              style={{ width: '24px', height: '24px', borderRadius: '4px' }}
                              disabled={item.quantity <= 1}
                            >
                              <Minus size={14} color={item.quantity <= 1 ? 'rgba(255,255,255,0.5)' : '#fff'} />
                            </button>
                            <span className="pos-quantity-text" style={{ fontSize: '14px', minWidth: '16px' }}>{item.quantity}</span>
                            <button 
                              className="pos-quantity-btn"
                              onClick={() => updateCartItemQuantity(item.id, 1)}
                              style={{ width: '24px', height: '24px', borderRadius: '4px', opacity: item.quantity >= (item.product.currentStock || 0) ? 0.5 : 1 }}
                            >
                              <Plus size={14} color="#fff" />
                            </button>
                          </div>
                          
                          <button 
                            className="pos-cart-item-delete-btn"
                            onClick={() => handleRemoveCartItem(item.id)}
                          >
                            <Trash2 size={20} color="#d32f2f" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            <div className="pos-cart-footer">
              <button className="pos-cart-promo-btn">
                <span>% Khuyến mãi</span>
                <img src={arrowWhite} alt="arrow" style={{ width: '10px', height: '10px', objectFit: 'contain' }} />
              </button>
              
              <div className="pos-cart-summary">
                <div className="pos-cart-summary-row">
                  <span>Tổng tạm tính</span>
                  <span style={{ fontWeight: 600 }}>{tempTotal.toLocaleString('vi-VN')}đ</span>
                </div>
                {discountPercent > 0 && (
                  <div className="pos-cart-summary-row">
                    <span>Giảm giá ({discountPercent}%)</span>
                    <span style={{ fontWeight: 600 }}>{discountAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                <div className="pos-cart-divider"></div>
                <div className="pos-cart-summary-row pos-cart-total-row">
                  <span>TỔNG</span>
                  <span className="pos-cart-final-total">{finalTotal.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
              
              <button 
                className="pos-cart-checkout-btn"
                onClick={() => {
                  setCashInput('0');
                  setPaymentImage(null);
                  setPaymentMethod('cash');
                  setIsCheckoutOpen(true);
                }}
              >
                THANH TOÁN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog */}
      {confirmDialog.open && (
        <div className="pos-confirm-overlay">
          <div className="pos-confirm-box" onClick={(e) => e.stopPropagation()}>
            <p className="pos-confirm-message">{confirmDialog.message}</p>
            <div className="pos-confirm-actions">
              <button className="pos-confirm-cancel" onClick={closeConfirm}>Hủy</button>
              <button className="pos-confirm-ok" onClick={handleConfirmOk}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Success Dialog */}
      {successDialog.open && (
        <div className="pos-confirm-overlay">
          <div className="pos-confirm-box pos-success-box" onClick={(e) => e.stopPropagation()}>
            <div className="pos-success-icon-wrapper">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="#349409"/>
              </svg>
            </div>
            <h3 className="pos-success-dialog-title">{successDialog.title}</h3>
            {successDialog.displayId && (
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#666' }}>Mã đơn khách hàng</span>
                <div style={{ fontSize: '36px', fontWeight: 800, color: '#349409', letterSpacing: '4px', lineHeight: 1.2 }}>
                  {successDialog.displayId}
                </div>
              </div>
            )}
            <p className="pos-confirm-message">{successDialog.message}</p>
            <div className="pos-confirm-actions">
              <button 
                className="pos-confirm-ok" 
                style={{ width: '100%', backgroundColor: '#349409' }} 
                onClick={() => setSuccessDialog(prev => ({ ...prev, open: false }))}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom No Card Dialog */}
      {noCardDialog && (
        <div className="pos-confirm-overlay">
          <div className="pos-confirm-box" onClick={(e) => e.stopPropagation()}>
            <p className="pos-confirm-message">Hiện tại cửa hàng đã hết thẻ trống! Quý khách vui lòng chọn Mang đi hoặc đợi có bàn/thẻ trống.</p>
            <div className="pos-confirm-actions">
              <button className="pos-confirm-cancel" onClick={() => setNoCardDialog(false)}>Hủy</button>
              <button className="pos-confirm-ok" onClick={() => navigate('/pos/tables')}>Đến thẻ bàn</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Error Dialog */}
      {errorDialog.open && (
        <div className="pos-confirm-overlay">
          <div className="pos-confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="pos-success-icon-wrapper" style={{ backgroundColor: 'rgba(211, 47, 47, 0.1)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#d32f2f"/>
              </svg>
            </div>
            <h3 className="pos-success-dialog-title" style={{ color: '#d32f2f' }}>{errorDialog.title}</h3>
            <p className="pos-confirm-message">{errorDialog.message}</p>
            <div className="pos-confirm-actions">
              <button 
                className="pos-confirm-ok" 
                style={{ width: '100%', backgroundColor: '#d32f2f' }} 
                onClick={() => setErrorDialog({ open: false, title: '', message: '' })}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit All Items Popup */}
      {isEditAllOpen && (
        <div className="pos-modal-overlay">
          <div className="pos-edit-all-sheet" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="pos-edit-all-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="pos-edit-all-title">Chi tiết các món</h2>
                <span className="pos-edit-all-badge">{editAllItems.length} món</span>
              </div>
              <button className="pos-edit-all-close" onClick={() => setIsEditAllOpen(false)}>
                <X size={24} color="#111" />
              </button>
            </div>

            {/* Body */}
            <div className="pos-edit-all-body">
              {editAllItems.map((item, index) => {
                const price = posUnitPrice(item.product, item.serveType, item.duration);

                return (
                  <div key={item.id} className="pos-edit-all-item">
                    <div className="pos-edit-all-row-first">
                      <span className="pos-edit-all-name">{item.product.name}</span>
                      <span className="pos-edit-all-price">{price.toLocaleString('vi-VN')}đ</span>
                    </div>
                    
                    <div className="pos-edit-all-row-second">
                      {/* Select Dropdown */}
                      <div className="pos-edit-all-select-wrapper">
                        <CustomSelect 
                          className="pos-edit-all-select"
                          value={item.serveType}
                          onChange={(val) => handleEditAllChange(item.id, 'serveType', val)}
                          options={[
                            { value: 'takeaway', label: 'Mang đi' },
                            { value: 'dine_in', label: 'Tại chỗ' }
                          ]}
                        />
                      </div>

                      {/* Radio buttons */}
                      <div className={`pos-edit-all-radios ${item.serveType === 'takeaway' ? 'disabled' : ''}`}>
                        <label className="pos-edit-all-radio-label">
                          <input 
                            type="radio" 
                            name={`duration_${item.id}`}
                            value="4h"
                            checked={item.duration === '4h'}
                            disabled={item.serveType === 'takeaway'}
                            onChange={() => handleEditAllChange(item.id, 'duration', '4h')}
                          />
                          <span className="pos-radio-circle"></span>
                          <span>4 giờ</span>
                        </label>

                        <label className="pos-edit-all-radio-label">
                          <input 
                            type="radio" 
                            name={`duration_${item.id}`}
                            value="all_day"
                            checked={item.duration === 'all_day'}
                            disabled={item.serveType === 'takeaway'}
                            onChange={() => handleEditAllChange(item.id, 'duration', 'all_day')}
                          />
                          <span className="pos-radio-circle"></span>
                          <span>Cả ngày</span>
                        </label>
                      </div>
                    </div>
                    
                    {index < editAllItems.length - 1 && <div className="pos-edit-all-divider"></div>}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pos-edit-all-footer">
              <button className="pos-edit-all-save-btn" onClick={handleSaveEditAll}>
                LƯU
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Checkout Screen Overlay */}
      {isCheckoutOpen && (
        <div className="pos-checkout-overlay">
          <div className="pos-checkout-container">
            {/* Header */}
            <div className="pos-checkout-header">
              <button className="pos-checkout-back-btn" onClick={() => setIsCheckoutOpen(false)}>
                <ChevronLeft size={24} color="#555" />
              </button>
              <h2 className="pos-checkout-title">Thanh toán</h2>
              <div style={{ width: '24px' }}></div>
            </div>

            {/* Total Amount Card */}
            <div className="pos-checkout-total-card">
              <span className="pos-checkout-total-label">Tổng tiền:</span>
              <span className="pos-checkout-total-value">{finalTotal.toLocaleString('vi-VN')}đ</span>
            </div>

            {/* Tabs */}
            <div className="pos-checkout-tabs">
              <button 
                className={`pos-checkout-tab ${paymentMethod === 'cash' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('cash')}
              >
                Tiền mặt
              </button>
              <button 
                className={`pos-checkout-tab ${paymentMethod === 'transfer' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('transfer')}
              >
                Chuyển khoản
              </button>
            </div>

            {/* Content Area */}
            <div className="pos-checkout-content">
              {paymentMethod === 'cash' ? (
                <div className="pos-cash-method">
                  {/* Cash input card */}
                  <div className="pos-cash-input-card">
                    <div className="pos-cash-input-top">
                      <span className="pos-cash-input-label">Khách đưa:</span>
                      <span className={`pos-cash-input-value ${cashInput === '0' ? 'placeholder' : ''}`}>
                        {(parseInt(cashInput) || 0).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <div className="pos-cash-input-bottom">
                      <span className="pos-change-label">Tiền thừa:</span>
                      <span className={`pos-change-value ${parseInt(cashInput) >= finalTotal ? 'positive' : ''}`}>
                        {parseInt(cashInput) >= finalTotal 
                          ? (parseInt(cashInput) - finalTotal).toLocaleString('vi-VN') + 'đ' 
                          : '0đ'}
                      </span>
                    </div>
                  </div>

                  {/* Keypad */}
                  <div className="pos-keypad">
                    <button className="pos-keypad-btn" onClick={() => handleKeypadPress('1')}>1</button>
                    <button className="pos-keypad-btn" onClick={() => handleKeypadPress('2')}>2</button>
                    <button className="pos-keypad-btn" onClick={() => handleKeypadPress('3')}>3</button>
                    
                    {/* Backspace spans 2 rows in column 4 */}
                    <button className="pos-keypad-btn pos-keypad-backspace" onClick={() => handleKeypadPress('backspace')}>
                      <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 3L2 9L9 15H21V3H9Z" stroke="#349409" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 7L16 11" stroke="#349409" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 7L12 11" stroke="#349409" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    
                    <button className="pos-keypad-btn" onClick={() => handleKeypadPress('4')}>4</button>
                    <button className="pos-keypad-btn" onClick={() => handleKeypadPress('5')}>5</button>
                    <button className="pos-keypad-btn" onClick={() => handleKeypadPress('6')}>6</button>
                    
                    <button className="pos-keypad-btn" onClick={() => handleKeypadPress('7')}>7</button>
                    <button className="pos-keypad-btn" onClick={() => handleKeypadPress('8')}>8</button>
                    <button className="pos-keypad-btn" onClick={() => handleKeypadPress('9')}>9</button>
                    
                    {/* NHẬP spans 2 rows in column 4 */}
                    <button className="pos-keypad-btn pos-keypad-enter" onClick={() => {
                      if (parseInt(cashInput) === 0) {
                        setCashInput(finalTotal.toString());
                      }
                    }}>
                      NHẬP
                    </button>
                    
                    <button className="pos-keypad-btn" onClick={() => handleKeypadPress('C')}>C</button>
                    <button className="pos-keypad-btn" onClick={() => handleKeypadPress('0')}>0</button>
                    <button className="pos-keypad-btn" onClick={() => handleKeypadPress('000')}>000</button>
                  </div>
                </div>
              ) : (
                <div className="pos-transfer-method">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    id="pos-camera-input" 
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                  <label htmlFor="pos-camera-input" className="pos-camera-card">
                    {paymentImage ? (
                      <img src={paymentImage} alt="proof" className="pos-proof-preview" />
                    ) : (
                      <div className="pos-camera-placeholder">
                        <Camera size={64} color="#ccc" />
                      </div>
                    )}
                  </label>
                </div>
              )}
            </div>

            {/* Bottom Checkout Button */}
            <div className="pos-checkout-footer">
              <button 
                className="pos-checkout-submit-btn"
                disabled={
                  paymentMethod === 'cash' 
                    ? (parseInt(cashInput) || 0) < finalTotal 
                    : !paymentImage
                }
                onClick={handleCompletePayment}
              >
                HOÀN TẤT THANH TOÁN
              </button>
          </div>
        </div>
      </div>
      )}
      {/* Card Selection Screen Overlay */}
      {isCardSelectionOpen && (
        <div className="pos-card-selection-overlay">
          <div className="pos-card-selection-container">
            {/* Header Success Section */}
            <div className="pos-card-selection-header">
              <div className="pos-card-success-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="#349409" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="pos-card-success-title">Thanh Toán Hoàn Tất!</h2>
            </div>

            {lockedCardNumber ? (
              <>
                {/* Locked card - pre-selected, cannot change */}
                <div className="pos-card-selection-subheader">
                  <span className="pos-card-selection-title">
                    {isExtend ? 'Thêm món vào thẻ' : 'Gán vào thẻ'}
                  </span>
                </div>
                <div className="pos-card-selection-grid" style={{ justifyContent: 'center' }}>
                  <button
                    className="pos-card-selection-btn active"
                    style={{ cursor: 'default' }}
                    disabled
                  >
                    {lockedCardNumber}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Title Section */}
                <div className="pos-card-selection-subheader">
                  <span className="pos-card-selection-title">Thẻ trống</span>
                  <span className="pos-card-selection-count">({freeCards.length})</span>
                </div>

                {/* Grid List of Free Cards */}
                <div className="pos-card-selection-grid">
                  {freeCards.map((card) => {
                    const isSelected = selectedCardNumber === card.cardNumber;
                    return (
                      <button
                        key={card.id}
                        className={`pos-card-selection-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedCardNumber(card.cardNumber)}
                        disabled={isSubmitting}
                      >
                        {card.cardNumber}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="pos-card-selection-footer">
              {lockedCardNumber ? (
                // Locked card mode: single CHỌN button
                <button 
                  className="pos-card-btn-select"
                  disabled={isSubmitting}
                  onClick={isExtend ? handleSkipCardSelection : handleSelectCardSelection}
                >
                  {isSubmitting ? 'ĐANG XỬ LÝ...' : 'CHỌN'}
                </button>
              ) : (
                <>
                  {(isTakeawayOnly || (hasAllDay && !has4h)) && (
                    <button 
                      className="pos-card-btn-skip"
                      onClick={handleSkipCardSelection}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'ĐANG XỬ LÝ...' : 'BỎ QUA'}
                    </button>
                  )}
                  
                  {!isTakeawayOnly && (
                    <button 
                      className="pos-card-btn-select"
                      disabled={!selectedCardNumber || isSubmitting}
                      onClick={handleSelectCardSelection}
                    >
                      {isSubmitting ? 'ĐANG XỬ LÝ...' : (has4h ? 'CHỌN' : 'XONG')}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
