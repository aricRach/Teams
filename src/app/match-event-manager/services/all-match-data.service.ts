import {computed, inject, Injectable} from '@angular/core';
import {MatchEventsApiService} from './match-events-api.service';
import {PlayersService} from '../../players/players.service';
import {MatchEventRecord, MatchRecord} from '../models/match-event.model';
import {rxResource, toObservable} from '@angular/core/rxjs-interop';
import {combineLatest, filter, firstValueFrom, map, of, switchMap} from 'rxjs';
import {formatDateToString} from '../../utils/date-utils';

@Injectable({providedIn: 'root'})
export class AllMatchDataService {
  private playersService = inject(PlayersService);
  private matchEventsApi = inject(MatchEventsApiService);

  private groupId = computed(() => this.playersService.selectedGroup()?.id);

  matchesResource = rxResource({
    params: () => ({groupId: this.groupId()}),
    stream: ({params}) => {
      if (!params.groupId) return of([]);
      return this.matchEventsApi.getMatches(params.groupId);
    }
  });

  relevantMatches = computed<MatchRecord[]>(() =>
    ((this.matchesResource.value() as MatchRecord[]) || []).filter(
      m => m.status === 'completed' || m.status === 'correction'
    )
  );

  private relevantMatches$ = toObservable(this.relevantMatches);

  eventsResource = rxResource({
    params: () => ({groupId: this.groupId()}),
    stream: ({params}) => {
      if (!params.groupId) return of([]);
      return this.relevantMatches$.pipe(
        switchMap(matches => {
          if (!matches.length) return of([]);
          return combineLatest(
            matches.map(match =>
              this.matchEventsApi.getAllEvents(params.groupId!, match.id!).pipe(
                map(events => ({match, events}))
              )
            )
          );
        })
      );
    }
  });

  matchesWithEvents = computed<{match: MatchRecord; events: MatchEventRecord[]}[]>(() =>
    this.eventsResource.value() ?? []
  );

  async getOrCreateCorrectionMatch(groupId: string, dateKey: string, createdBy: string): Promise<string> {
    const existing = this.matchesWithEvents().find(({match}) => {
      if (match.status !== 'correction' || !match.createdAt?.seconds) return false;
      return formatDateToString(new Date(match.createdAt.seconds * 1000)) === dateKey;
    });
    if (existing) return existing.match.id!;
    return this.matchEventsApi.createCorrectionMatch(groupId, dateKey, createdBy);
  }
}
