import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { glossary } from '../data/glossary';

interface Props {
  term: string;
  label?: string;
}

/**
 * Small (?) icon with a hover/focus tooltip explaining financial jargon.
 * Rendered via portal to document.body with viewport-aware placement, so it
 * is never clipped by overflow-hidden cards or covered by the sticky header.
 */
export const InfoTip: React.FC<Props> = ({ term, label }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean }>({
    left: 0,
    top: 0,
    below: false,
  });
  const btnRef = useRef<HTMLButtonElement>(null);

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

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    // Reposition (or dismiss) on scroll/resize so it never floats detached.
    const onScroll = () => hide();
    const onResize = () => hide();
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, hide]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label ?? `What is ${term}?`}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => (open ? hide() : show())}
        className="text-slate-500 hover:text-blue-400 transition-colors focus:outline-none focus:text-blue-400 inline-flex items-center align-middle ml-1.5"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open &&
        createPortal(
          <div
            role="tooltip"
            className="fixed z-[70] w-60 p-3 rounded-xl bg-slate-900 border border-slate-700 text-[11px] leading-relaxed text-slate-200 shadow-2xl"
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
