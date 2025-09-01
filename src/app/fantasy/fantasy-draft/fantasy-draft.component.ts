import {Component, inject, OnInit} from '@angular/core';
import {FantasyDraftService} from '../services/fantasy-draft.service';
import {PlayersService} from '../../players/players.service';
import {CommonModule} from '@angular/common';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {FantasyMeta} from '../services/fantasy-api.service';
import {ActivatedRoute} from '@angular/router';

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
  private route = inject(ActivatedRoute);

  async ngOnInit() {
    const meta = this.route.parent?.snapshot.data['fantasyMeta'];
    if(meta) {
      this.fantasyDraftService.setMetaData(meta as FantasyMeta)
      const nextDate = meta?.nextDate;
      if(nextDate) {
        await this.fantasyDraftService.getUserPicks(nextDate);
      }
    }
  }
}


