import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { combineLatest, interval, merge, Subject, timer } from 'rxjs';
import { map, take, takeUntil, tap } from 'rxjs/operators';
import { RevealApiService, RevealTeam, PositionedPlayer, Position } from './reveal-api.service';

export type RevealPhase = 'loading' | 'team-reveal' | 'all-teams';

export interface PositionGroup {
  position: Position;
  players: PositionedPlayer[];
  startIndex: number;
}

@Injectable()
export class RevealService implements OnDestroy {
  private revealApi = inject(RevealApiService);

  readonly phase = signal<RevealPhase>('loading');
  readonly teams = signal<RevealTeam[]>([]);
  readonly teamIndex = signal(0);
  readonly animatedRating = signal(0);
  readonly attackScore = signal(0);
  readonly defenseScore = signal(0);
  readonly shownPlayers = signal(0);

  readonly currentTeam = computed(() => this.teams()[this.teamIndex()]);

  // FWD at top → MID → DEF at bottom for pitch layout.
  // startIndex tracks position in flat DEF→MID→FWD order for staggered animation.
  readonly currentGroups = computed(() => this.groupsByPosition(this.currentTeam()));
  readonly allTeamGroups = computed(() =>
    this.teams().map(team => ({ team, groups: this.groupsByPosition(team) }))
  );

  private readonly destroy$ = new Subject<void>();

  start(groupId: string) {
    this.phase.set('loading');
    combineLatest([
      timer(1800),
      this.revealApi.getSnapshot(groupId).pipe(take(1)),
    ]).pipe(takeUntil(this.destroy$)).subscribe(([, snapshot]) => {
      if (snapshot?.teams?.length) {
        this.teams.set(snapshot.teams);
        this.phase.set('team-reveal');
        this.revealTeam(0);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private revealTeam(index: number) {
    const team = this.teams()[index];
    if (!team) { this.phase.set('all-teams'); return; }

    this.teamIndex.set(index);
    this.shownPlayers.set(0);
    this.animatedRating.set(0);
    this.attackScore.set(0);
    this.defenseScore.set(0);

    const playerStreams = team.players.map((_, i) =>
      timer(2800 + i * 300).pipe(tap(() => this.shownPlayers.set(i + 1)))
    );

    merge(
      timer(400).pipe(tap(() => this.animateRating(team.rating))),
      timer(1600).pipe(tap(() => this.attackScore.set(team.attackScore))),
      timer(1900).pipe(tap(() => this.defenseScore.set(team.defenseScore))),
      ...playerStreams,
      timer(2800 + team.players.length * 300 + 1500).pipe(tap(() => this.revealTeam(index + 1))),
    ).pipe(takeUntil(this.destroy$)).subscribe();
  }

  private animateRating(target: number) {
    interval(40).pipe(
      take(30),
      map(step => Math.round((target * (step + 1)) / 30)),
      takeUntil(this.destroy$),
    ).subscribe(value => this.animatedRating.set(value));
  }

  private groupsByPosition(team: RevealTeam | undefined): PositionGroup[] {
    if (!team) return [];
    const flatOrder: Position[] = ['DEF', 'MID', 'FWD'];
    const indexMap = new Map<Position, number>();
    let idx = 0;
    for (const pos of flatOrder) {
      indexMap.set(pos, idx);
      idx += team.players.filter(p => p.position === pos).length;
    }
    return (['FWD', 'MID', 'DEF'] as Position[])
      .map(pos => ({
        position: pos,
        players: team.players.filter(p => p.position === pos),
        startIndex: indexMap.get(pos) ?? 0,
      }))
      .filter(g => g.players.length > 0);
  }
}
