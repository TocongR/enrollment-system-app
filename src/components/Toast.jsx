// src/components/Toast.jsx
import { useEffect, useState } from 'react';

const Toast = ({ message, type = 'success', duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: { bg: '#dcfce7', border: '#86efac', text: '#16a34a', icon: '✓' },
    error:   { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626', icon: '✕' },
    info:    { bg: '#dbeafe', border: '#93c5fd', text: '#2563eb', icon: 'ℹ' },
  };

  const c = colors[type] || colors.success;

  return (
    <div
      className="fixed top-4 right-4 z-[200] transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
      }}
    >
      <div
        className="flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border"
        style={{
          background: c.bg,
          borderColor: c.border,
          fontFamily: "'DM Sans', sans-serif",
          minWidth: '280px',
          maxWidth: '420px',
        }}
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: c.text, color: '#fff' }}
        >
          {c.icon}
        </span>
        <p className="text-sm font-medium flex-1" style={{ color: c.text }}>
          {message}
        </p>
        <button
          onClick={() => { setVisible(false); setTimeout(() => onClose?.(), 300); }}
          className="text-lg leading-none opacity-60 hover:opacity-100 transition shrink-0"
          style={{ color: c.text }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;
