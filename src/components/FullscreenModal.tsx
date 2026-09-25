import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const FullscreenModal: React.FC<Props> = ({ title, onClose, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Portal to document.body: ancestors with backdrop-filter / transform /
  // overflow create a containing block that would trap position:fixed.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="glass-panel rounded-2xl w-full max-w-[1400px] h-full max-h-full overflow-y-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 sticky top-0">
          <h3 className="text-base sm:text-lg font-bold dark:text-slate-100 text-slate-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close fullscreen view"
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};
