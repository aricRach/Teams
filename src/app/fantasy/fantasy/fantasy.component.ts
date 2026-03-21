import {Component, computed, inject, input, OnInit} from '@angular/core';
import {ActivatedRoute, RouterModule} from '@angular/router';
import {FantasyService} from '../services/fantasy.service';
import {FantasyMeta} from '../services/fantasy-api.service';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';
import {compareDateWithToday} from '../../utils/date-utils';

@Component({
  selector: 'app-fantasy',
  imports: [RouterModule],
  providers: [FantasyService],
  templateUrl: './fantasy.component.html',
  styleUrl: './fantasy.component.scss'
})
export class FantasyComponent {

  fantasyService = inject(FantasyService);
  fantasyMeta = input<FantasyMeta>();
  route = inject(ActivatedRoute);

  canDraft = computed(() => {
    const isDraftActive = this.fantasyMeta()?.isActive;
    return isDraftActive && compareDateWithToday(this.fantasyMeta()?.nextDate) >= 0
  })

  // reload meta because navigated from manage fantasy. trigger run guardAndResolvers.
  // avoid using runGuardsAndResolvers always because every navigation-tab click it will trigger api call.
  reloadParam = toSignal(
    this.route.queryParamMap.pipe(
      map(params => {
        const val = params.get('reload');
        return val && val.length ? val : undefined;
      })
    )
  );
}
