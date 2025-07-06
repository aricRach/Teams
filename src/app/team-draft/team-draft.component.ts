import {Component, computed, ElementRef, inject, input, OnDestroy, OnInit, signal, ViewChild} from '@angular/core';
import {TeamDraftService} from './services/team-draft.service';
import {NgIf} from '@angular/common';
import {Subscription} from 'rxjs';
import {RouterModule} from '@angular/router';
import {TeamDraftSession} from '../create-draft-session/services/create-draft-session.service';
import {FormsModule} from '@angular/forms';
import {ChatComponent, ChatMessage} from 'ui';

@Component({
  selector: 'app-team-draft',
  imports: [NgIf, RouterModule, FormsModule, ChatComponent ],
  templateUrl: './team-draft.component.html',
  styleUrl: './team-draft.component.scss'
})
export class TeamDraftComponent implements OnInit, OnDestroy{

  teamDraftService = inject(TeamDraftService);
  // @ts-ignore
  session = signal<any>(null);
  messages = signal<ChatMessage[]>([]);
  notify = signal(false)

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
       this.session.set(data as TeamDraftSession);
     } else {
       this.teamDraftService.popupsService.addSuccessPopOut('session ended')
       this.teamDraftService.router.navigate(['home']);
     }
   })));

   this.subscription.add(this.teamDraftService.getMessages(this.sessionId(), this.groupId())
     .subscribe((msgs) => {
       if(msgs.length > this.messages().length && this.messages().length > 0 && msgs[msgs.length - 1]['senderId'] !== this.teamDraftService.auth.currentUser?.email) {
         this.notify.set(true)
         window.setTimeout(() => {
           this.notify.set(false)
         }, 2000)
       }
       this.messages.set(msgs as ChatMessage[]);
     }))
  }

  async assignPlayer(player: {id: string, name: string}) {
    if (!this.isMyTurn()) {
      return;
    }
    await this.teamDraftService.assignPlayer(this.sessionId(), this.groupId(), player, 'team'+ this.myTeamIndex());
  }

  async sendMessage(msg: string) {
   await this.teamDraftService.sendMessage(msg, this.sessionId(), this.groupId());
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
