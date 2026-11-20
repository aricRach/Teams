/** What the chart shows, and how. Both live in the URL. */
export type ChartStat = 'goals' | 'wins' | 'winPct' | 'performance';
export type ChartMode = 'day' | 'cumulative';

export const DEFAULT_CHART_STAT: ChartStat = 'goals';
export const DEFAULT_CHART_MODE: ChartMode = 'day';

export const CHART_STATS: { value: ChartStat; label: string }[] = [
  { value: 'goals', label: 'Goals' },
  { value: 'wins', label: 'Wins' },
  { value: 'winPct', label: 'Win %' },
  { value: 'performance', label: 'Performance' },
];

export const CHART_MODES: { value: ChartMode; label: string }[] = [
  { value: 'day', label: 'Each day' },
  { value: 'cumulative', label: 'Total so far' },
];

export function parseChartStat(value: string | null): ChartStat {
  return CHART_STATS.find(stat => stat.value === value)?.value ?? DEFAULT_CHART_STAT;
}

export function parseChartMode(value: string | null): ChartMode {
  return value === 'cumulative' ? 'cumulative' : DEFAULT_CHART_MODE;
}
