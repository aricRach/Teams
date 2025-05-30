import {Component, computed, inject, input, OnDestroy, OnInit, signal} from '@angular/core';
import {TeamDraftService} from './services/team-draft.service';
import {NgIf} from '@angular/common';
import {Subscription} from 'rxjs';
import {RouterModule} from '@angular/router';

@Component({
  selector: 'app-team-draft',
  imports: [NgIf, RouterModule ],
  templateUrl: './team-draft.component.html',
  styleUrl: './team-draft.component.scss'
})
export class TeamDraftComponent implements OnInit, OnDestroy{

  teamDraftService = inject(TeamDraftService);
  session = signal<any>(null);
  sessionId = input<string>('');
  groupId = input<string>('');
  currentUserEmail = '';

  range = computed(() => Array.from({ length: this.session()?.teamCount }, (_, i) => i));
  isMyTurn = computed(() => {
    return this.session()?.members[this.session().currentTurn] === this.currentUserEmail
  })
  isCompleted = computed(() => this.session()?.status === 'completed');
  myTeamIndex = computed(() => this.session()?.members.findIndex((email: string) => email === this.currentUserEmail));

  subscription = new Subscription();

  ngOnInit(): void {
    this.currentUserEmail = this.teamDraftService.auth.currentUser?.email || '';
   this.subscription.add(this.teamDraftService.getSession(this.sessionId(), this.groupId()).subscribe((data => {
     if(data) {
       this.session.set(data);
     } else {
       this.teamDraftService.popupsService.addSuccessPopOut('session ended')
       this.teamDraftService.router.navigate(['home']);
     }
   })));
  }

  async assignPlayer(player: {id: string, name: string}) {
    if (!this.isMyTurn()) {
      return;
    }
    await this.teamDraftService.assignPlayer(this.sessionId(), this.groupId(), player, 'team'+ this.myTeamIndex());
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
