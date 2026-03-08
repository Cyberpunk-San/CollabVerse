import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  Loader2
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  action?: {
    label: string;
    onClick: () => void;
  };
}

const typeStyles = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  loading: 'bg-gray-50 text-gray-800 border-gray-200'
};

const typeIcons = {
  success: <CheckCircle className="h-5 w-5 text-green-400" />,
  error: <AlertCircle className="h-5 w-5 text-red-400" />,
  info: <Info className="h-5 w-5 text-blue-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-400" />,
  loading: <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
};

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
};

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type = 'info',
  duration = 5000,
  onClose,
  position = 'top-right',
  action
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (type === 'loading' || duration === Infinity) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setProgress((remaining / duration) * 100);

      if (elapsed >= duration) {
        clearInterval(interval);
        setIsExiting(true);
        setTimeout(() => onClose(id), 300);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [duration, id, onClose, type]);

  return createPortal(
    <div
      className={`
        fixed ${positionClasses[position]} z-50
        transition-all duration-300 transform
        ${isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
        max-w-md w-full
      `}
    >
      <div className={`rounded-lg border ${typeStyles[type]} shadow-lg relative overflow-hidden`}>
        {/* Progress bar for auto-dismiss */}
        {type !== 'loading' && duration !== Infinity && (
          <div
            className="absolute bottom-0 left-0 h-1 bg-current opacity-20 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        )}

        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">{typeIcons[type]}</div>

            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">{message}</p>
            </div>

            {action && (
              <button
                onClick={() => {
                  action.onClick();
                  setIsExiting(true);
                  setTimeout(() => onClose(id), 300);
                }}
                className="ml-4 text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                {action.label}
              </button>
            )}

            <button
              onClick={() => {
                setIsExiting(true);
                setTimeout(() => onClose(id), 300);
              }}
              className="ml-4 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Toast Context with queue management
interface ToastContextType {
  showToast: (message: string, options?: {
    type?: ToastType;
    duration?: number;
    action?: { label: string; onClick: () => void };
  }) => string;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  loading: (message: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  update: (id: string, message: string, type?: ToastType) => void;
}

export const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([]);
  const maxToasts = 5;

  const showToast = (message: string, options?: {
    type?: ToastType;
    duration?: number;
    action?: { label: string; onClick: () => void };
  }) => {
    const id = Math.random().toString(36).substr(2, 9);

    setToasts(prev => {
      const newToasts = [{
        id,
        message,
        type: options?.type || 'info',
        duration: options?.duration,
        action: options?.action,
        onClose: (id: string) => dismiss(id)
      }, ...prev];

      // Limit number of toasts
      return newToasts.slice(0, maxToasts);
    });

    return id;
  };

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const dismissAll = () => {
    setToasts([]);
  };

  const update = (id: string, message: string, type?: ToastType) => {
    setToasts(prev => prev.map(toast =>
      toast.id === id ? { ...toast, message, type: type || toast.type } : toast
    ));
  };

  const value: ToastContextType = {
    showToast,
    success: (message, duration) => showToast(message, { type: 'success', duration }),
    error: (message, duration) => showToast(message, { type: 'error', duration }),
    info: (message, duration) => showToast(message, { type: 'info', duration }),
    warning: (message, duration) => showToast(message, { type: 'warning', duration }),
    loading: (message) => showToast(message, { type: 'loading', duration: Infinity }),
    dismiss,
    dismissAll,
    update
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} />
      ))}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};