import {Component, computed, HostListener, inject, input, linkedSignal, signal,} from '@angular/core';
import {CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {CommonModule} from '@angular/common';
import {DoubleClickDirective} from '../../directives/double-click.directive';
import {GoalModalEvent, Player} from '../models/player.model';
import {currentDate} from '../../utils/date-utils';
import {PlayerViewComponent} from '../player-view/player-view.component';
import {PlayersService} from '../players.service';
import {AuditTrailService} from '../../audit-trail/services/audit-trail.service';
import {shuffleArray} from '../../utils/array-utils';
import {ModalComponent} from '../../../modals/modal/modal.component';
import {AdminControlService} from '../../user/admin-control.service';

@Component({
  selector: 'app-players-drag-drop-table',
  imports: [DragDropModule, CommonModule, DoubleClickDirective, PlayerViewComponent, ModalComponent],
  standalone: true,
  templateUrl: './players-drag-drop-table.component.html',
  styleUrl: './players-drag-drop-table.component.scss'
})
export class PlayersDragDropTableComponent {

  isLocked = input.required();

  playersService = inject(PlayersService);
  adminControlService = inject(AdminControlService);
  auditTrailService = inject(AuditTrailService);

  clonedTeams = computed(() => structuredClone(this.playersService.computedTeams()));
  setGoalModalData = signal<GoalModalEvent>({} as GoalModalEvent) ;
  makeBalancedTeamsModalVisible = signal(false);
  getGoalModalDataByPlayer = linkedSignal(() =>
    this.setGoalModalData().player.statistics[currentDate]?.goals || 0)
  isSetGoalModalVisible = signal(false);

  modalPosition = signal({ x: 0, y: 0 });

  showStatistics = signal(false);
  totalRatings = linkedSignal(() => this.setTotalRatingToAllTeams());

  readonly teamKeys = computed(() =>
    Object.keys(this.clonedTeams() ?? {}).filter(key => key !== 'allPlayers').slice(0, this.playersService.numberOfTeams())
  );

  readonly dropListRefs = computed(() =>
    [...this.teamKeys(), 'allPlayers']
  );


  private setTotalRatingToAllTeams() {
    const teams = this.clonedTeams();
    return Object.entries(teams).filter((team) => {
      return team[0] !== 'allPlayers'
    })
      .reduce((acc, [teamName, teamData]) => {
        // @ts-ignore
        acc[teamName] = this.calculateRating(teamData.players);
        return acc;
      }, {} as any) as any
  }

  isAdminMode = computed(() => this.adminControlService.adminControl().isAdminMode);
  toggleShowStatistics() {
    this.showStatistics.set(!this.showStatistics());
  }

  closeSetGoalModal() {
    this.isSetGoalModalVisible.set(false);
  }

  calculateRating(players: Player[]) {
    return players.reduce((sum, player) => sum + player.rating, 0);
  }

  drop(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      event.container.data.forEach((p: Player) => {
        // @ts-ignore
        p.team = event.container.id;
      })
      // this.totalRatings.set(this.setTotalRatingToAllTeams());
    }
    this.playersService.setTeams(this.clonedTeams())
  }

  removeFromList(team: string, index: number) {
    const allTeams = this.playersService.getTeams();
    allTeams[team]?.players.splice(index, 1);
    this.playersService.setTeams(allTeams);
  }

  openSetGoalModal(event: { position: {pageX: number, pageY: number}}, data: {player: any; team: string}): void {
    const pageX = event.position.pageX;
    const pageY = event.position.pageY;

    this.modalPosition.set({ x: pageX, y: pageY });
    this.setGoalModalData.set({
      player: data.player,
      team: data.team
    });
    this.isSetGoalModalVisible.set(true);
  }

  setGoalModalClicked(addGoal: boolean) {
    let goals = this.getGoalModalDataByPlayer();
    if (addGoal) {
      goals++;
    } else if (goals > 0) {
      goals--;
    }
    this.getGoalModalDataByPlayer.set(goals);
  }

  setGoals() {
    const teamName = this.setGoalModalData().team;
    const goals = this.getGoalModalDataByPlayer();
    const team = this.playersService.getTeams()[teamName];
    const playerIndex = team.players.findIndex((player: Player) => player.name === this.setGoalModalData().player.name);

    if (playerIndex >= 0) {
      const player = team.players[playerIndex];
      const stats = { ...player.statistics };
      const dateStats = { ...stats[currentDate] }; // make sure even if its undefined it will be {}
      const prevGoals = dateStats.goals;
      dateStats.goals = goals;
      team.players[playerIndex].statistics[currentDate] = dateStats;
      this.playersService.updatePlayer(team.players[playerIndex], player, true).then(() => {
        this.auditTrailService.addAuditTrail(`goals set for ${player.name} ${prevGoals || 0} -> ${goals}`)
      });
      this.closeSetGoalModal();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isSetGoalModalVisible()) {
      const modal = document.querySelector('.set-goal-modal');
      if (modal && !modal.contains(event.target as Node)) {
        this.isSetGoalModalVisible.set(false);
      }
    }
  }

  makeBalancedTeams() {
    const teams = this.clonedTeams();
    const numberOfTeams = this.playersService.numberOfTeams();

    const teamEntries = Object.entries(teams).slice(1, numberOfTeams + 1); // all active teams except "allPlayers"
    const players = this.playersService.flattenPlayers(Object.fromEntries(teamEntries));

    const shuffledPlayers = shuffleArray(players);
    shuffledPlayers.sort((a, b) => b.rating - a.rating);

    // Initialize team structures
    const teamMap: Record<string, { players: Player[], totalRating: number }> = {};
    teamEntries.forEach(([teamKey]) => {
      teamMap[teamKey] = { players: [], totalRating: 0 };
    });

    shuffledPlayers.forEach((player, index) => {
      const teamIndex = index % numberOfTeams;
      const [teamKey] = teamEntries[teamIndex];
      teamMap[teamKey].players.push(player);
      teamMap[teamKey].totalRating += player.rating;
    });

    // shuffle balanced teams to avoid knowing level of each player.
    for(const teamKey in teamMap) {
      const currentTeam = teamMap[teamKey];
      currentTeam.players = shuffleArray(currentTeam.players);
    }

    this.playersService.setTeams({...teams, ...teamMap});
    //
    // return Object.fromEntries(
    //   Object.entries(teamMap).map(([key, val]) => [key, val.players])
    // );
  }

   setBalancedTeamsModal(confirm : boolean) {
    if(confirm) {
      this.makeBalancedTeams();
    }
    this.makeBalancedTeamsModalVisible.set(false);
  }
}
