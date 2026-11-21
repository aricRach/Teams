import {Statistics} from '../../players/models/player.model';
import {compareDates} from '../../utils/date-utils';

/** The latest date the player played a game on, or null if never. */
export function lastPlayedDate(statsByDate: Map<string, Statistics> | undefined): string | null {
  const playedDates = [...(statsByDate?.entries() ?? [])]
    .filter(([, stats]) => stats.games > 0)
    .map(([date]) => date)
    .sort(compareDates);
  return playedDates.at(-1) ?? null;
}
