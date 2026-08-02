import React from 'react';
import { CheckCircle2, Sparkles, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-fade-in">
      <div className="flex items-center gap-3 bg-slate-900/95 text-slate-100 px-4 py-3 rounded-xl border border-blue-500/40 shadow-glow backdrop-blur-md text-xs font-semibold">
        <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
        <span>{message}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded-lg"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
