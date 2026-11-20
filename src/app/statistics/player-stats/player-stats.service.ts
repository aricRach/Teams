import {computed, inject, Injectable, signal} from '@angular/core';
import {ActivatedRoute, Params, Router} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {ChartData} from 'chart.js';
import {AutoCompleteOption} from 'ui';
import {PlayersService} from '../../players/players.service';
import {Player, Statistics} from '../../players/models/player.model';
import {ComputedStatisticsService} from '../services/computed-statistics.service';
import {PERFORMANCE_RULES} from '../utils/performance.util';
import {formatDateSpan, formatDay, plural, spansMultipleYears} from '../utils/stats-format.util';
import {matchesOnDates} from '../utils/match-summary.util';
import {totalsForDates} from '../utils/player-totals.util';
import {datesInRange, parseRange, rangeQueryParam, STATS_RANGES, StatsRange} from '../utils/stats-range.util';
import {MAX_COMPARED_PLAYERS, parsePlayerIds, PLAYER_COLORS, playerTag} from './utils/selected-players.util';
import {
  CHART_MODES, CHART_STATS, ChartMode, ChartStat, DEFAULT_CHART_MODE, DEFAULT_CHART_STAT, parseChartMode, parseChartStat,
} from './utils/chart-settings.util';
import {buildChartCaption, buildChartDataset, buildChartOptions} from './utils/chart.util';
import {buildStatTableRows} from './utils/stat-table.util';
import {buildPerformanceExample} from './utils/performance-example.util';
import {buildHeadToHeadView} from './utils/head-to-head-view.util';

@Injectable()
export class PlayerStatsService {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private playersService = inject(PlayersService);
  private computedStatisticsService = inject(ComputedStatisticsService);

  readonly ranges = STATS_RANGES;
  readonly chartStats = CHART_STATS;
  readonly chartModes = CHART_MODES;
  readonly performanceRules = PERFORMANCE_RULES;

  readonly isLoading = this.computedStatisticsService.isLoading;
  readonly hasError = this.computedStatisticsService.hasError;

  reload() {
    this.computedStatisticsService.reload();
  }

  // ---------- state (lives in the URL so a comparison can be shared) ----------

  private queryParams = toSignal(this.route.queryParamMap, {requireSync: true});

  range = computed(() => parseRange(this.queryParams().get('range')));
  chartMode = computed(() => parseChartMode(this.queryParams().get('mode')));
  chartStat = computed(() => parseChartStat(this.queryParams().get('stat')));

  /** Active players plus inactive ones, so old comparisons still work. */
  private allPlayers = computed<Player[]>(() => {
    const activePlayers = this.playersService.flattenPlayers(true, true);
    const activeIds = new Set(activePlayers.map(player => player.id));
    const inactivePlayers = (this.playersService.getInactivePlayers() ?? [])
      .filter((player: Player) => !activeIds.has(player.id));
    return [...activePlayers, ...inactivePlayers];
  });

  private playersById = computed(() => new Map(this.allPlayers().map(player => [player.id, player])));

  /** Every id in the URL, including ones not loaded yet, so editing the list never drops them. */
  private urlPlayerIds = computed(() => parsePlayerIds(this.queryParams().get('players')));

  selectedPlayers = computed<Player[]>(() =>
    this.urlPlayerIds()
      .map(id => this.playersById().get(id))
      .filter((player): player is Player => !!player)
      .slice(0, MAX_COMPARED_PLAYERS)
  );

  private selectedPlayerIds = computed(() => this.selectedPlayers().map(player => player.id));

  emptyStateHint = `Add up to ${MAX_COMPARED_PLAYERS} players to compare them.`;

  hasPlayers = computed(() => this.selectedPlayers().length > 0);
  isComparing = computed(() => this.selectedPlayers().length > 1);
  canAddPlayer = computed(() => this.selectedPlayers().length < MAX_COMPARED_PLAYERS);
  addPlayerLabel = computed(() => {
    if (!this.hasPlayers()) return 'Select player';
    return this.canAddPlayer() ? '+ Add player' : `Max ${MAX_COMPARED_PLAYERS} players`;
  });

  selectedPlayerChips = computed(() => this.selectedPlayers().map((player, index) => ({
    id: player.id,
    name: player.name,
    color: PLAYER_COLORS[index],
    tag: playerTag(player),
  })));

  /** Guests are left out of the picker; a guest in a shared URL still shows. */
  private pickablePlayers = computed(() => {
    const selectedIds = new Set(this.selectedPlayerIds());
    return this.allPlayers()
      .filter(player => !player.isGuest && !selectedIds.has(player.id))
      .sort((first, second) => first.name.localeCompare(second.name));
  });

  /** Active players first, then inactive ones marked "(inactive)". */
  pickerOptions = computed<AutoCompleteOption[]>(() => {
    const activeOptions = this.pickablePlayers()
      .filter(player => player.isActive !== false)
      .map(player => ({value: player.id, alias: player.name}));
    const inactiveOptions = this.pickablePlayers()
      .filter(player => player.isActive === false)
      .map(player => ({value: player.id, alias: `${player.name} (inactive)`}));
    return [...activeOptions, ...inactiveOptions];
  });

  /** The picked player leaves the options, so the autocomplete clears itself for the next pick. */
  onPickPlayer(option: AutoCompleteOption) {
    if (!option.value || !this.canAddPlayer()) return;
    this.setPlayerIds([...this.urlPlayerIds(), option.value]);
  }

  removePlayer(playerId: string) {
    this.setPlayerIds(this.urlPlayerIds().filter(id => id !== playerId));
  }

  setRange(range: StatsRange) {
    this.updateQueryParams({range: rangeQueryParam(range)});
  }

  setChartMode(mode: ChartMode) {
    this.updateQueryParams({mode: mode === DEFAULT_CHART_MODE ? null : mode});
  }

  setChartStat(stat: ChartStat) {
    this.updateQueryParams({stat: stat === DEFAULT_CHART_STAT ? null : stat});
  }

  private setPlayerIds(playerIds: string[]) {
    this.updateQueryParams({players: playerIds.length ? playerIds.join(',') : null});
  }

  private updateQueryParams(queryParams: Params) {
    this.router.navigate([], {relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: true});
  }

  // ---------- range ----------

  private dates = computed(() => datesInRange(this.computedStatisticsService.allDatesWithActivity(), this.range()));

  rangeLabel = computed(() => {
    const dates = this.dates();
    if (!dates.length) return 'No game days yet';
    return `${plural(dates.length, 'game day')} · ${formatDateSpan(dates)}`;
  });

  private statsByDateFor(playerId: string): Map<string, Statistics> {
    return this.computedStatisticsService.statsForPlayer(playerId);
  }

  // ---------- stat table ----------

  private selectedPlayersTotals = computed(() =>
    this.selectedPlayers().map(player => totalsForDates(this.statsByDateFor(player.id), this.dates()))
  );

  /** Active non-guest players who played in the range; used for the rank in the single-player view. */
  private groupTotals = computed(() =>
    this.playersService.flattenPlayers(true, false)
      .map((player: Player) => totalsForDates(this.statsByDateFor(player.id), this.dates()))
      .filter(totals => totals.games > 0)
  );

  tableRows = computed(() => buildStatTableRows(this.selectedPlayersTotals(), this.groupTotals()));

  // ---------- performance explainer ----------

  private isPerformanceInfoOpen = signal(false);

  togglePerformanceInfo() {
    this.isPerformanceInfoOpen.update(isOpen => !isOpen);
  }

  openPerformanceInfo() {
    this.isPerformanceInfoOpen.set(true);
  }

  closePerformanceInfo() {
    this.isPerformanceInfoOpen.set(false);
  }

  /** Null while closed. The worked example uses the first selected player's latest game day in the range. */
  performanceExample = computed(() => {
    if (!this.isPerformanceInfoOpen() || !this.hasPlayers()) return null;
    const firstPlayer = this.selectedPlayers()[0];
    return buildPerformanceExample(firstPlayer.name, this.statsByDateFor(firstPlayer.id), this.dates());
  });

  // ---------- chart ----------

  isPerformanceStat = computed(() => this.chartStat() === 'performance');

  chartData = computed<ChartData<'line', (number | null)[], string>>(() => {
    const dates = this.dates();
    return {
      labels: dates.map(date => formatDay(date, spansMultipleYears(dates))),
      datasets: this.selectedPlayers().map((player, index) =>
        buildChartDataset(player, PLAYER_COLORS[index], this.statsByDateFor(player.id), dates, this.chartStat(), this.chartMode())
      ),
    };
  });

  chartOptions = computed(() => buildChartOptions(this.chartStat()));

  chartCaption = computed(() => buildChartCaption(this.chartStat(), this.chartMode()));

  // ---------- head to head (exactly 2 players) ----------

  headToHead = computed(() => {
    const players = this.selectedPlayers();
    if (players.length !== 2) return null;
    const matches = matchesOnDates(this.computedStatisticsService.matchSummaries(), this.dates());
    return buildHeadToHeadView(players[0], players[1], matches);
  });
}
