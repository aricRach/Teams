/** Which game days the Player Stats and Leaders pages look at. */
export type StatsRange = '5' | '10' | 'all';

export const STATS_RANGES: { value: StatsRange; label: string }[] = [
  { value: '5', label: 'Last 5' },
  { value: '10', label: 'Last 10' },
  { value: 'all', label: 'All time' },
];

export const DEFAULT_RANGE: StatsRange = '10';

export function parseRange(value: string | null): StatsRange {
  return value === '5' || value === 'all' ? value : DEFAULT_RANGE;
}

/** The range as a query param value: null for the default, so the URL stays clean. */
export function rangeQueryParam(range: StatsRange): StatsRange | null {
  return range === DEFAULT_RANGE ? null : range;
}

/** The group's last N game days (dates sorted oldest first). */
export function datesInRange(allDates: string[], range: StatsRange): string[] {
  return range === 'all' ? allDates : allDates.slice(-Number(range));
}
