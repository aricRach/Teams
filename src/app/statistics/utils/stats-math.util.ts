/** part / whole, or 0 when whole is 0. */
export function ratio(part: number, whole: number): number {
  return whole ? part / whole : 0;
}

/** Whole-number percentage, e.g. 7 of 10 -> 70. */
export function percentOf(part: number, whole: number): number {
  return Math.round(ratio(part, whole) * 100);
}

/** roundTo(2.345, 1) -> 2.3 */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
