import {Component, computed, inject, input, OnInit} from '@angular/core';
import {ActivatedRoute, RouterOutlet} from '@angular/router';
import {FantasyService} from '../services/fantasy.service';
import {FantasyMeta} from '../services/fantasy-api.service';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';
import {compareDateWithToday} from '../../utils/date-utils';
import {SectionLayoutComponent} from '../../shared/layouts/section-layout/section-layout.component';
import {InnerTab} from '../../shared/inner-tabs/inner-tabs.component';
import {PlayersService} from '../../players/players.service';
import {Auth} from '@angular/fire/auth';
import {PopupsService} from 'ui';

@Component({
  selector: 'app-fantasy',
  imports: [SectionLayoutComponent, RouterOutlet],
  providers: [FantasyService],
  templateUrl: './fantasy.component.html',
  styleUrl: './fantasy.component.scss'
})
export class FantasyComponent {

  fantasyService = inject(FantasyService);
  fantasyMeta = input<FantasyMeta>();
  route = inject(ActivatedRoute);

  private playersService = inject(PlayersService);
  private auth = inject(Auth);
  private popupsService = inject(PopupsService);

  /** Signed-in viewer from a shared link who isn't a member yet. */
  isViewer = computed(() => !this.playersService.isMember());
  userEmail = this.auth.currentUser?.email ?? '';

  copyEmail() {
    navigator.clipboard.writeText(this.userEmail).then(
      () => this.popupsService.addSuccessPopOut('Email copied to clipboard!'),
      () => this.popupsService.addErrorPopOut("Couldn't copy the email."),
    );
  }

  canDraft = computed(() => {
    if (!this.playersService.isMember()) return false; // viewers from a shared link are read-only
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

  tabs = computed((): InnerTab[] => {
    const queryParams = {reload: this.reloadParam()};
    const tab = (link: string, title: string): InnerTab => ({link, title, tooltip: '', isDisabled: false, queryParams});
    return [
      ...(this.canDraft() ? [tab('draft', 'Draft')] : []),
      tab('analytics', 'Leaderboard'),
      ...(this.fantasyService.isAdmin() ? [tab('manage-fantasy-meta', 'Manage fantasy')] : []),
    ];
  });
}
