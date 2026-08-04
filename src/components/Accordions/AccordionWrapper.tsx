import React from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionWrapperProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  badgeText?: string;
  children: React.ReactNode;
}

export const AccordionWrapper: React.FC<AccordionWrapperProps> = ({
  title,
  subtitle,
  icon,
  isOpen,
  onToggle,
  badgeText,
  children,
}) => {
  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        isOpen
          ? 'dark:bg-slate-900/90 bg-white/95 dark:border-blue-500/40 border-blue-500/50 shadow-glow'
          : 'dark:bg-slate-900/40 bg-white/60 dark:border-slate-800 border-slate-200 dark:hover:border-slate-700 hover:border-slate-300 dark:hover:bg-slate-900/60 hover:bg-white/90'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4.5 flex items-center justify-between text-left focus:outline-none select-none group"
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`p-2.5 rounded-xl transition-colors duration-200 shrink-0 ${
              isOpen
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-600 group-hover:text-blue-500'
            }`}
          >
            {icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold dark:text-slate-100 text-slate-800 group-hover:text-blue-500 transition-colors">
                {title}
              </h3>
              {badgeText && (
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                  {badgeText}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs dark:text-slate-400 text-slate-500 mt-1 leading-relaxed">{subtitle}</p>}
          </div>
        </div>

        <div
          className={`p-1.5 rounded-lg dark:text-slate-400 text-slate-500 transition-transform duration-300 shrink-0 ${
            isOpen ? 'rotate-180 text-blue-500 bg-blue-500/10' : 'group-hover:text-blue-500'
          }`}
        >
          <ChevronDown className="w-5 h-5" />
        </div>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t dark:border-slate-800/60 border-slate-200 animate-fade-in space-y-5">
          {children}
        </div>
      )}
    </div>
  );
};
