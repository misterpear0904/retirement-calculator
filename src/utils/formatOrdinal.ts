export function formatOrdinal(n: number): string {
  const num = Math.round(Number.isFinite(n) ? n : 0);
  const v = Math.abs(num) % 100;
  const suffix = v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][v % 10] || 'th';
  // clamp suffix index for 0..3
  let s = 'th';
  const last = v % 10;
  if (!(v >= 11 && v <= 13)) {
    if (last === 1) s = 'st';
    else if (last === 2) s = 'nd';
    else if (last === 3) s = 'rd';
  }
  return `${num}${s}`;
}

export const ordinal = formatOrdinal;
export default formatOrdinal;
