import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { glossary, glossaryLabel, isPluralTerm } from '../data/glossary';

interface Props {
  term: string;
  label?: string;
}

/**
 * Small (?) icon with a hover/focus tooltip explaining financial jargon.
 * Rendered via portal to document.body with viewport-aware placement, so it
 * is never clipped by overflow-hidden cards or covered by the sticky header.
 */
export function humanizeTerm(term: string): string {
  return term
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase();
}

export const InfoTip: React.FC<Props> = ({ term, label }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean }>({
    left: 0,
    top: 0,
    below: false,
  });
  const btnRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(false);
  const tooltipHoveredRef = useRef(false);
  const buttonHoveredRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const width = 240;
    const left = Math.min(Math.max(cx, width / 2 + 8), window.innerWidth - width / 2 - 8);
    const gap = 10;
    // Prefer above; flip below when there isn't room (e.g. under the sticky header).
    const estHeight = 120;
    const below = r.top - gap - estHeight < 64;
    setPos({
      left,
      top: below ? r.bottom + gap : r.top - gap,
      below,
    });
  }, []);

  const show = useCallback(() => {
    place();
    setOpen(true);
  }, [place]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearHideTimer();
    pinnedRef.current = false;
    tooltipHoveredRef.current = false;
    buttonHoveredRef.current = false;
    setOpen(false);
  }, [clearHideTimer]);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      if (pinnedRef.current || buttonHoveredRef.current || tooltipHoveredRef.current) return;
      setOpen(false);
    }, 0);
  }, [clearHideTimer]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!open) {
        place();
        pinnedRef.current = true;
        setOpen(true);
        return;
      }
      if (pinnedRef.current) {
        pinnedRef.current = false;
        setOpen(false);
        return;
      }
      // Hover-opened: pin it so it stays open.
      pinnedRef.current = true;
    },
    [open, place]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    // Reposition (or dismiss) on scroll/resize so it never floats detached.
    const onScroll = () => hide();
    const onResize = () => hide();
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, hide]);

  const ariaLabel =
    label ?? `${isPluralTerm(term) ? 'What are' : 'What is'} ${glossaryLabel(term)}?`;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onMouseEnter={() => {
          buttonHoveredRef.current = true;
          clearHideTimer();
          show();
        }}
        onMouseLeave={() => {
          buttonHoveredRef.current = false;
          if (pinnedRef.current || tooltipHoveredRef.current) return;
          scheduleHide();
        }}
        onFocus={show}
        onBlur={(e) => {
          if (pinnedRef.current) return;
          const next = e.relatedTarget;
          if (tooltipRef.current && next instanceof Node && tooltipRef.current.contains(next)) return;
          hide();
        }}
        onClick={handleClick}
        className="relative z-10 pointer-events-auto text-slate-500 hover:text-blue-400 transition-colors focus:outline-none focus:text-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 inline-flex items-center align-middle ml-1.5 p-2 -m-2 min-w-[44px] min-h-[44px] justify-center cursor-pointer"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            onMouseEnter={() => {
              tooltipHoveredRef.current = true;
              clearHideTimer();
              show();
            }}
            onMouseLeave={() => {
              // Defer clearing the hovered flag so a button mouseleave that fires
              // in the same event sequence still sees the tooltip as hovered.
              window.setTimeout(() => {
                tooltipHoveredRef.current = false;
                if (pinnedRef.current || buttonHoveredRef.current) return;
                scheduleHide();
              }, 0);
            }}
            className="fixed z-[70] w-60 p-3 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 text-[11px] leading-relaxed dark:text-slate-200 text-slate-800 shadow-2xl pointer-events-auto"
            style={{
              left: pos.left,
              top: pos.top,
              transform: pos.below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            }}
          >
            {glossary(term)}
          </div>,
          document.body
        )}
    </>
  );
};
