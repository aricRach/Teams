import {computed, inject, Injectable} from '@angular/core';
import {MatchEventsApiService} from './match-events-api.service';
import {PlayersService} from '../../players/players.service';
import {MatchEventRecord, MatchRecord} from '../models/match-event.model';
import {rxResource, toObservable} from '@angular/core/rxjs-interop';
import {combineLatest, filter, firstValueFrom, map, of, switchMap} from 'rxjs';

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
    ((this.matchesResource.value() as MatchRecord[]) || []).filter(m => m.status === 'completed')
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

  readonly isInitialLoading = computed(() =>
    (this.matchesResource.isLoading() && !this.matchesResource.hasValue()) ||
    (this.eventsResource.isLoading() && !this.eventsResource.hasValue())
  );

  readonly hasError = computed(() => !!this.matchesResource.error() || !!this.eventsResource.error());

  reload(): void {
    this.matchesResource.reload();
    this.eventsResource.reload();
  }

  matchesWithEvents = computed<{match: MatchRecord; events: MatchEventRecord[]}[]>(() =>
    this.eventsResource.value() ?? []
  );
}
