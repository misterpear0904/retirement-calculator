export function formatOrdinal(n: number): string {
  const num = Math.round(Number.isFinite(n) ? n : 0);
  const v = Math.abs(num) % 100;
  const last = v % 10;
  const s =
    v >= 11 && v <= 13
      ? 'th'
      : last === 1
        ? 'st'
        : last === 2
          ? 'nd'
          : last === 3
            ? 'rd'
            : 'th';
  return `${num}${s}`;
}
