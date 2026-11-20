import { ChartDataset, ChartOptions } from 'chart.js';
import { Player, Statistics } from '../../../players/models/player.model';
import { calculatePerformance } from '../../utils/performance.util';
import { emptyStatistics } from '../../utils/player-totals.util';
import { percentOf, roundTo } from '../../utils/stats-math.util';
import { ChartMode, ChartStat } from './chart-settings.util';

function dayValue(stats: Statistics, stat: ChartStat): number {
  if (stat === 'goals') return stats.goals;
  if (stat === 'wins') return stats.wins;
  if (stat === 'winPct') return percentOf(stats.wins, stats.games);
  return calculatePerformance(stats);
}

/** One point per game day: the value that day, or null on days the player missed. */
function dailySeries(statsByDate: Map<string, Statistics>, dates: string[], stat: ChartStat): (number | null)[] {
  return dates.map(date => {
    const stats = statsByDate.get(date);
    if (!stats || stats.games === 0) return null;
    return dayValue(stats, stat);
  });
}

/** Running totals for goals/wins, running averages for Win % and Performance. */
function cumulativeSeries(statsByDate: Map<string, Statistics>, dates: string[], stat: ChartStat): (number | null)[] {
  const runningTotals = emptyStatistics();
  let gameDays = 0;
  let performanceSum = 0;
  return dates.map(date => {
    const stats = statsByDate.get(date);
    if (stats && stats.games > 0) {
      runningTotals.goals += stats.goals;
      runningTotals.wins += stats.wins;
      runningTotals.games += stats.games;
      performanceSum += calculatePerformance(stats);
      gameDays++;
    }
    if (stat === 'goals') return runningTotals.goals;
    if (stat === 'wins') return runningTotals.wins;
    if (!gameDays) return null;
    if (stat === 'winPct') return percentOf(runningTotals.wins, runningTotals.games);
    return roundTo(performanceSum / gameDays, 1);
  });
}

/** One player's line on the chart. */
export function buildChartDataset(
  player: Player, color: string, statsByDate: Map<string, Statistics>, dates: string[], stat: ChartStat, mode: ChartMode,
): ChartDataset<'line', (number | null)[]> {
  const data = mode === 'day' ? dailySeries(statsByDate, dates, stat) : cumulativeSeries(statsByDate, dates, stat);
  return {
    label: player.name,
    data,
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2.5,
    pointRadius: dates.length > 20 ? 2 : 3.5,
    pointHoverRadius: 6,
    tension: 0.25,
    spanGaps: true,
  };
}

export function buildChartOptions(stat: ChartStat): ChartOptions<'line'> {
  const isPercent = stat === 'winPct';
  const suffix = isPercent ? '%' : '';
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: context => {
            const valueText = context.parsed.y === null ? 'did not play' : context.parsed.y + suffix;
            return ` ${context.dataset.label}: ${valueText}`;
          },
        },
      },
    },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, grid: { display: false } },
      y: {
        beginAtZero: true,
        suggestedMax: isPercent ? 100 : undefined,
        ticks: { precision: 0, callback: value => `${value}${suffix}` },
      },
    },
  };
}

const STAT_DESCRIPTIONS: Record<ChartStat, string> = {
  goals: 'goals scored',
  wins: 'matches won',
  winPct: '% of matches won',
  performance: 'performance score',
};

/** The line under the chart explaining what each point means. */
export function buildChartCaption(stat: ChartStat, mode: ChartMode): string {
  const statDescription = STAT_DESCRIPTIONS[stat];
  if (mode === 'day') {
    return `Each point is the player's ${statDescription} on that game day. Days they didn't play are skipped and the line joins across them.`;
  }
  const flatNote = 'The line stays flat on days the player missed.';
  if (stat === 'winPct') {
    return `Each point is the running win %: all wins ÷ all matches played, from the start of the range up to that game day. ${flatNote}`;
  }
  if (stat === 'performance') {
    return `Each point is the running average of game-day performance scores, from the start of the range up to that game day. ${flatNote}`;
  }
  return `Each point is the total ${statDescription} from the start of the range up to that game day. ${flatNote}`;
}
