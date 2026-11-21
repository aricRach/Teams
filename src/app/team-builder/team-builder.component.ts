import {Component, inject} from '@angular/core';
import {NgStyle} from '@angular/common';
import {RouterLink} from '@angular/router';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {GameLayoutComponent} from '../shared/layouts/game-layout/game-layout.component';
import {PlayerViewComponent} from '../players/player-view/player-view.component';
import {TeamColorPickerComponent} from '../shared/team-color-picker/team-color-picker.component';
import {TeamScoreBarsComponent} from '../shared/team-score-bars/team-score-bars.component';
import {ModalComponent} from '../../modals/modal/modal.component';
import {PlayersDragDropTableService} from '../players/players-drag-drop-table/players-drag-drop-table.service';
import {TeamBuilderService} from './team-builder.service';
import {AddGuestComponent} from './add-guest/add-guest.component';

@Component({
  selector: 'app-team-builder',
  standalone: true,
  imports: [GameLayoutComponent, NgStyle, RouterLink, DragDropModule, PlayerViewComponent, TeamColorPickerComponent, TeamScoreBarsComponent, ModalComponent, AddGuestComponent],
  providers: [TeamBuilderService, PlayersDragDropTableService],
  templateUrl: './team-builder.component.html',
  styleUrl: './team-builder.component.scss',
  host: {
    '(document:keydown.escape)': 'teamBuilderService.closeMoveMenu()',
    '(window:scroll)': 'teamBuilderService.closeMoveMenu()',
    '(window:resize)': 'teamBuilderService.closeMoveMenu()',
  },
})
export class TeamBuilderComponent {
  protected teamBuilderService = inject(TeamBuilderService);
}
