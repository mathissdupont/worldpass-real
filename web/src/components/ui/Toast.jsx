// web/src/components/ui/Toast.jsx
// Toast notification system

import { useEffect } from 'react';

/**
 * Toast notification component
 * @param {Object} props
 * @param {Object} props.toast - Toast object {type: 'success'|'error'|'info', text: string}
 * @param {Function} props.onClose - Close handler
 * @param {number} props.duration - Auto-dismiss duration in ms (default: 2500)
 */
export default function Toast({ toast, onClose, duration = 2500 }) {
  useEffect(() => {
    if (!toast) return;
    
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [toast, onClose, duration]);

  if (!toast) return null;

  const variantClasses = {
    success: 'border-emerald-400/30 text-emerald-300 bg-emerald-500/10',
    error: 'border-rose-400/30 text-rose-300 bg-rose-500/10',
    info: 'border-blue-400/30 text-blue-300 bg-blue-500/10',
    warning: 'border-amber-400/30 text-amber-300 bg-amber-500/10',
  };

  const icons = {
    success: (
      <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
    error: (
      <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
    info: (
      <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    ),
    warning: (
      <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  };

  const type = toast.type || 'info';

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50 
        px-4 py-3 rounded-xl shadow-xl border
        text-sm max-w-md
        animate-in slide-in-from-bottom-4 fade-in duration-300
        ${variantClasses[type]}
      `.replace(/\s+/g, ' ').trim()}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        {icons[type]}
        <span className="flex-1">{toast.text}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Close notification"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
