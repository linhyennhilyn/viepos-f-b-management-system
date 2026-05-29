import { useEffect, useState } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

// Singleton toast manager
let toastIdCounter = 0;
let globalShowToast: ((message: string, type?: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = 'success') {
  if (globalShowToast) {
    globalShowToast(message, type);
  }
}

export default function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    globalShowToast = (message: string, type: ToastType = 'success') => {
      const id = ++toastIdCounter;
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3500);
    };

    return () => {
      globalShowToast = null;
    };
  }, []);

  const getIcon = (type: ToastType) => {
    if (type === 'success') return '✓';
    if (type === 'error') return '✕';
    if (type === 'warning') return '⚠';
    return 'ℹ';
  };

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast-item toast-${toast.type}`}>
          <div className={`toast-icon-badge toast-icon-${toast.type}`}>
            {getIcon(toast.type)}
          </div>
          <div className="toast-message">{toast.message}</div>
        </div>
      ))}
    </div>
  );
}
