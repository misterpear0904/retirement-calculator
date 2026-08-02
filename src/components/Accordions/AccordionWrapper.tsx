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
          ? 'bg-slate-900/90 border-blue-500/40 shadow-glow'
          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left focus:outline-none select-none group"
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`p-2.5 rounded-xl transition-colors duration-200 ${
              isOpen
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-750'
            }`}
          >
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                {title}
              </h3>
              {badgeText && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {badgeText}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div
          className={`p-1.5 rounded-lg text-slate-400 transition-transform duration-300 ${
            isOpen ? 'rotate-180 text-blue-400 bg-blue-500/10' : 'group-hover:text-slate-200'
          }`}
        >
          <ChevronDown className="w-5 h-5" />
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-800/60 animate-fade-in space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};
