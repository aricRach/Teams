import {Component, computed, inject, signal} from '@angular/core';
import {PlayersService} from '../players.service';
import {
  DynamicComponentsTypes,
  FormField,
  GenericFormComponent,
  genericValidators,
  PopupsService,
  subInputType
} from 'ui';
import {FormGroup, FormsModule} from '@angular/forms';

@Component({
  selector: 'app-edit-player',
  imports: [
    GenericFormComponent,
    FormsModule],
  templateUrl: './edit-player.component.html',
  standalone: true,
  styleUrl: './edit-player.component.scss'
})
export class EditPlayerComponent {

  playersService = inject(PlayersService);
  popUpService = inject(PopupsService);
  controls = computed<FormField[]>(() => this.buildJson());

  allPlayersArray = computed(() => this.playersService.flattenPlayers());
  selectedPlayerOption = '';
  selectedPlayer = signal<any>(null);
  shouldDisabledFields = computed(() => !this.selectedPlayer())

  private buildJson() {
    console.log(this.shouldDisabledFields())
    return [
      {
        alias: 'name:',
        name: 'name',
        disabled: true,
        value: this.selectedPlayer()?.name,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        validators: {},
      },
      {
        alias: 'rating:',
        name: 'rating',
        disabled: this.shouldDisabledFields(),
        value: this.selectedPlayer()?.rating,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        subInputType: subInputType.NUMBER,
        validators: genericValidators.required,
      },
    ]
  }

  editPlayer(playerDetails: FormGroup<any>) {

    const details = playerDetails.getRawValue();
    details.rating = Number(details.rating)
    this.playersService.updatePlayer({...this.selectedPlayer(), ...details}, false).then(() => {
      this.playersService.teams.update((teams) => {
        const name = this.selectedPlayer().name;
        return teams;
      })
    });
  }

  onChange() {
    alert(this.selectedPlayerOption)
    this.selectedPlayer.set(this.selectedPlayerOption);

    this.selectedPlayer.set(this.playersService.flattenPlayers().filter((p => p.name === this.selectedPlayerOption))[0]);
  }
}
