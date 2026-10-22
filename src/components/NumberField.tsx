import React, { useState } from 'react';

/**
 * Validated money/number text input (P1 round-3 task 2).
 *
 * Problem it fixes: the previous raw `type="number"` inputs silently mutated or
 * ignored bad entries (typing "-100" crept toward the cap, PASTING "-100" set
 * the value to 0 with no message, "abc" vanished silently).
 *
 * Behavior:
 *  - Renders as type="text" inputMode="decimal" so every keystroke (typed or
 *    pasted — a paste fires the same onChange path) is visible and validated.
 *  - Invalid or negative entries show error styling + a short inline message
 *    ("Enter a number 0 or greater") and are never committed, so the field
 *    keeps showing the invalid text until blur.
 *  - On blur the text reverts to the last valid value (the committed state
 *    value); the error styling persists until a valid entry replaces it.
 *  - Valid entries (including over-max values) are passed through unclamped so
 *    the app-level clamp toast ("Capped X at $Y") still fires.
 */
interface NumberFieldProps {
  /** Last valid (committed) value. Shown whenever the user hasn't typed. */
  value: number;
  /** Called with a parsed, finite, >= 0 number for valid entries only. */
  onChange: (value: number) => void;
  /** Accessible name for the input. */
  ariaLabel?: string;
  /** DOM id to hook to an external <label htmlFor>. */
  id?: string;
  /** Inline prefix such as "$". */
  prefix?: string;
  /** Tailwind classes for the input itself (colors/padding/rounding). */
  className?: string;
}

// Accepts "", "-", "5", "5.", "5.5" — everything a user types on the way
// to a final number. Anything else (letters, "1e5", "1,000") is invalid.
const ERROR_TEXT = 'Enter a number 0 or greater';
const TYPABLE = /^-?\d*(\.\d*)?$/;

export const NumberField: React.FC<NumberFieldProps> = ({
  value,
  onChange,
  ariaLabel,
  id,
  prefix,
  className = '',
}) => {
  // Raw text while the user is editing; null = show the committed value.
  const [raw, setRaw] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setRaw(text);
    if (text === '') {
      // Cleared for a fresh entry: not an error yet, nothing committed.
      setError(false);
      return;
    }
    if (!TYPABLE.test(text)) {
      setError(true); // e.g. "abc" — typed or pasted, same treatment.
      return;
    }
    const v = parseFloat(text);
    if (!Number.isFinite(v) || v < 0) {
      setError(true); // "-" or "-100" — visible immediately, never committed.
      return;
    }
    setError(false);
    if (v !== value) onChange(v); // passthrough: over-max still clamps+toasts upstream
  };

  const handleBlur = () => {
    // Revert the text to the last valid value. The red error styling persists
    // (mirrors BasicModeInputs) until the user types something valid.
    setRaw(null);
  };

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm dark:text-slate-400 text-slate-600 font-bold pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={raw ?? String(value)}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-label={ariaLabel}
        aria-invalid={error || undefined}
        aria-describedby={error && id ? `${id}-error` : undefined}
        className={`w-full bg-white dark:bg-slate-900 border ${
          error ? 'border-red-500' : 'dark:border-slate-700 border-slate-300'
        } rounded-lg ${prefix ? 'pl-7' : 'pl-3'} pr-3 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 ${className}`}
      />
      {error && (
        <p
          role="alert"
          id={id ? `${id}-error` : undefined}
          className="text-xs text-red-400 mt-1"
        >
          {ERROR_TEXT}
        </p>
      )}
    </div>
  );
};

export default NumberField;
