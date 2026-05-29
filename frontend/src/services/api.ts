import axios from 'axios';

// Địa chỉ của Spring Boot backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động đính kèm JWT token vào mọi request (nếu đã đăng nhập)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Nếu token hết hạn (401), tự động logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      
      // Bỏ qua logic đăng xuất tự động đối với các API kiểm tra mật khẩu/PIN
      if (url.includes('/login') || url.includes('/verify-pin') || url.includes('/pin-change-request') || url.includes('/forgot-pin')) {
        return Promise.reject(error);
      }

      localStorage.removeItem('token');
      // Không tự động redirect nếu đang ở trang Đăng nhập
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  adminLogin: (data: any) => api.post('/api/auth/login', data),
  adminRegister: (data: any) => api.post('/api/auth/admin/register', data),
  staffLogin: (data: any) => api.post('/api/staff/login', data),
  staffRegister: (data: any) => api.post('/api/staff/register', data),
  verifyPin: (data: any) => api.post('/api/staff/verify-pin', data),
  requestPinChange: (data: any) => api.post('/api/staff/pin-change-request', data),
};

export const staffAPI = {
  getAll: () => api.get('/api/staff/all'),
  getPending: () => api.get('/api/staff/pending'),
  approve: (id: string) => api.put(`/api/staff/${id}/approve`),
  reject: (id: string) => api.put(`/api/staff/${id}/reject`),
  
  getHistoryAccounts: () => api.get('/api/staff/history/accounts'),
  
  getPendingPinRequests: () => api.get('/api/staff/pin-change-requests/pending'),
  getHistoryPinRequests: () => api.get('/api/staff/pin-change-requests/history'),
  approvePinRequest: (id: string) => api.put(`/api/staff/pin-change-requests/${id}/approve`),
  rejectPinRequest: (id: string) => api.put(`/api/staff/pin-change-requests/${id}/reject`),
  
  getPendingPinResets: () => api.get('/api/staff/pin-reset-requests/pending'),
  getHistoryPinResets: () => api.get('/api/staff/pin-reset-requests/history'),
  approvePinReset: (id: string) => api.put(`/api/staff/pin-reset-requests/${id}/approve`),
  rejectPinReset: (id: string) => api.put(`/api/staff/pin-reset-requests/${id}/reject`),

  // Direct CRUD (admin actions)
  create: (data: { name: string; email: string; phone: string; role?: string; pin?: string; password?: string }) =>
    api.post('/api/staff', data),
  update: (id: string, data: { name?: string; email?: string; phone?: string; status?: string; role?: string }) =>
    api.put(`/api/staff/${id}`, data),
  delete: (id: string) => api.delete(`/api/staff/${id}`),
};

export const productAPI = {
  getProducts: () => api.get('/api/products'),
  getCategories: () => api.get('/api/categories'),
};

export const cardAPI = {
  getCards: () => api.get('/api/cards'),
  getFreeCards: () => api.get('/api/cards/free'),
  startSession: (data: {
    cardNumber: string;
    orderId: string;
    duration: string;
    paymentMethod?: string;
    paymentAmount?: number;
    cashReceived?: number;
    paymentImage?: string | null;
    items?: Array<{
      id: string;
      productId?: string;
      quantity: number;
      price: number;
      note?: string;
      serveType?: string;
      duration?: string;
    }>;
  }) => api.post('/api/cards/session', data),
  extendSession: (cardNumber: string, newEndTime: string, serviceType?: string) => api.put(`/api/cards/session/${cardNumber}/extend`, { newEndTime, serviceType }),
  releaseCard: (cardNumber: string) => api.post(`/api/cards/release/${cardNumber}`),
  getSessions: () => api.get('/api/cards/sessions?activeOnly=true'),
  updateCardStatus: (cardNumber: string, status: string) => api.post(`/api/cards/${cardNumber}/status`, { status }),
};

/** Trích danh sách đơn từ response phân trang `{ content, ... }` hoặc mảng cũ. */
export function unwrapOrdersList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === 'object' && Array.isArray((data as { content?: unknown }).content)) {
    return (data as { content: Record<string, unknown>[] }).content;
  }
  return [];
}

export const orderAPI = {
  getNextId: () => api.get('/api/orders/next-id'),
  getOrders: (params?: {
    fromDate?: string;
    toDate?: string;
    status?: string;
    employeeId?: string;
    page?: number;
    size?: number;
  }) => api.get('/api/orders', { params }),
  getOrderById: (id: string, options?: { includeTransferProof?: boolean }) =>
    api.get(`/api/orders/${id}`, {
      params: { includeTransferProof: options?.includeTransferProof ?? false },
    }),
  getStats: (params?: { fromDate?: string; toDate?: string }) =>
    api.get('/api/orders/stats', { params }),
  updateStatus: (id: string, status: string, note?: string) =>
    api.put(`/api/orders/${id}/status`, { status, note }),
  createTakeaway: (data: { orderId: string; paymentMethod: string; paymentAmount: number; cashReceived?: number; paymentImage: string | null; items?: any[] }) =>
    api.post('/api/orders/takeaway', data),
  appendItems: (data: {
    orderCode: string;
    paymentMethod?: string;
    paymentAmount?: number;
    cashReceived?: number;
    paymentImage?: string | null;
    items: Array<{
      id: string;
      productId?: string;
      quantity: number;
      price: number;
      note?: string;
      serveType?: string;
      duration?: string;
    }>;
  }) => api.post('/api/orders/append-items', data),
};

export const inventoryAPI = {
  getTransactions: (params?: { fromDate?: string; toDate?: string; type?: string }) =>
    api.get('/api/inventory/transactions', { params }),
  createTransaction: (data: { type: string; note: string; items: any[] }) =>
    api.post('/api/inventory/transaction', data),
};

export default api;
