import {Component, inject, input, OnInit} from '@angular/core';
import {FantasyDraftService} from '../services/fantasy-draft.service';
import {PlayersService} from '../../players/players.service';
import {CommonModule} from '@angular/common';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {FantasyMeta} from '../services/fantasy-api.service';

@Component({
  selector: 'app-fantasy-draft',
  imports: [CommonModule, DragDropModule],
  providers: [FantasyDraftService],
  templateUrl: './fantasy-draft.component.html',
  styleUrl: './fantasy-draft.component.scss'
})
export class FantasyDraftComponent implements OnInit{

  fantasyDraftService = inject(FantasyDraftService);
  playersService = inject(PlayersService);
  draftMeta = input<FantasyMeta>();

  async ngOnInit() {
    this.fantasyDraftService.setMetaData(this.draftMeta() as FantasyMeta)
    // todo: load the relevant date
   await this.fantasyDraftService.getUserPicks('09-08-2025');
  }
}
