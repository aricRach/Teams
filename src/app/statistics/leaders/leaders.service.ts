import {computed, inject, Injectable} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {PlayersService} from '../../players/players.service';
import {Player} from '../../players/models/player.model';
import {ComputedStatisticsService} from '../services/computed-statistics.service';
import {formatDateSpan, plural} from '../utils/stats-format.util';
import {matchesOnDates} from '../utils/match-summary.util';
import {totalsForDates} from '../utils/player-totals.util';
import {rankTopThree} from './utils/ranking.util';
import {datesInRange, parseRange, rangeQueryParam, STATS_RANGES, StatsRange} from '../utils/stats-range.util';
import {buildLeaderCards} from './leaders.util';

export interface LeaderCard {
  title: string;
  description: string;
  rows: {
    /** The player ids joined by ','; unique per card, unlike names. */
    id: string;
    rank: number;
    name: string;
    valueText: string;
    sub: string;
    /** Opens Player Stats with these players and the same range. */
    queryParams: Record<string, string | null>;
  }[];
}

@Injectable()
export class LeadersService {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private playersService = inject(PlayersService);
  private computedStatisticsService = inject(ComputedStatisticsService);

  readonly ranges = STATS_RANGES;
  readonly isLoading = this.computedStatisticsService.isLoading;
  readonly hasError = this.computedStatisticsService.hasError;

  reload() {
    this.computedStatisticsService.reload();
  }

  private queryParams = toSignal(this.route.queryParamMap, {requireSync: true});
  range = computed(() => parseRange(this.queryParams().get('range')));

  setRange(range: StatsRange) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {range: rangeQueryParam(range)},
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  playerStatsUrl = computed(() => this.playersService.groupUrl('statistics', 'players'));

  private dates = computed(() => datesInRange(this.computedStatisticsService.allDatesWithActivity(), this.range()));

  private matches = computed(() => matchesOnDates(this.computedStatisticsService.matchSummaries(), this.dates()));

  rangeLabel = computed(() => {
    const dates = this.dates();
    if (!dates.length) return 'No game days yet';
    return `${plural(dates.length, 'game day')} · ${plural(this.matches().length, 'match', 'matches')} · ${formatDateSpan(dates)}`;
  });

  /** Guests are left out; inactive players count if they played in the range. */
  private players = computed<Player[]>(() => {
    const activePlayers = this.playersService.flattenPlayers(true, false);
    const activeIds = new Set(activePlayers.map(player => player.id));
    const inactivePlayers = (this.playersService.getInactivePlayers() ?? [])
      .filter((player: Player) => !player.isGuest && !activeIds.has(player.id));
    return [...activePlayers, ...inactivePlayers];
  });

  private playersWithTotals = computed(() =>
    this.players()
      .map(player => ({player, totals: totalsForDates(this.computedStatisticsService.statsForPlayer(player.id), this.dates())}))
      .filter(({totals}) => totals.games > 0)
  );

  cards = computed<LeaderCard[]>(() => {
    const range = rangeQueryParam(this.range());
    return buildLeaderCards(this.players(), this.playersWithTotals(), this.matches(), this.dates().length)
      .map(card => ({
        title: card.title,
        description: card.description,
        rows: rankTopThree(card.entries, card.better).map(entry => ({
          id: entry.playerIds.join(','),
          rank: entry.rank,
          name: entry.name,
          valueText: entry.valueText,
          sub: entry.sub ?? '',
          queryParams: {players: entry.playerIds.join(','), range},
        })),
      }));
  });
}
