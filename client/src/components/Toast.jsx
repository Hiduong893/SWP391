import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    setToasts((prev) => {
      // Prevent stacking duplicate toast messages on screen
      if (prev.some((t) => t.message === message)) {
        return prev;
      }
      const id = crypto.randomUUID();
      setTimeout(() => {
        removeToast(id);
      }, duration);
      return [...prev, { id, message, type }];
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast: addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onClose }) => {
  const { message, type } = toast;

  const icons = {
    success: <CheckCircle className="toast-icon text-success" size={20} />,
    error: <AlertOctagon className="toast-icon text-error" size={20} />,
    warning: <AlertTriangle className="toast-icon text-warning" size={20} />,
    info: <Info className="toast-icon text-info" size={20} />
  };

  return (
    <div className={`toast-item toast-${type}`}>
      <div className="toast-content">
        {icons[type]}
        <span className="toast-message">{message}</span>
      </div>
      <button onClick={onClose} className="toast-close-btn">
        <X size={16} />
      </button>
      <div className="toast-progress"></div>
    </div>
  );
};

// Add raw CSS styling variables for toasts
const injectToastStyles = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'toast-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 400px;
      width: calc(100% - 48px);
      pointer-events: none;
    }

    .toast-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(17, 19, 28, 0.95);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 14px 18px;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      pointer-events: auto;
      overflow: hidden;
      position: relative;
      animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      gap: 12px;
    }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }

    .toast-icon {
      flex-shrink: 0;
    }

    .toast-icon.text-success { color: #10b981; }
    .toast-icon.text-error { color: #f43f5e; }
    .toast-icon.text-warning { color: #f59e0b; }
    .toast-icon.text-info { color: #6366f1; }

    .toast-message {
      font-size: 14px;
      font-weight: 500;
      color: #f8fafc;
      line-height: 1.4;
    }

    .toast-close-btn {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 2px;
      border-radius: 4px;
      transition: all 0.2s;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toast-close-btn:hover {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.05);
    }

    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #6366f1, #a855f7);
      width: 100%;
      animation: toastProgressAnimation 4s linear forwards;
    }

    .toast-error .toast-progress {
      background: #f43f5e;
    }

    .toast-success .toast-progress {
      background: #10b981;
    }

    @keyframes toastSlideIn {
      from {
        transform: translateY(-20px) scale(0.9);
        opacity: 0;
      }
      to {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }

    @keyframes toastProgressAnimation {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }
  `;
  document.head.appendChild(style);
};

injectToastStyles();
