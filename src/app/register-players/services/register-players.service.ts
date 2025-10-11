import {inject, Injectable, linkedSignal, signal} from '@angular/core';
import {PopupsService} from 'ui';
import {RegisterPlayersApiService} from './register-players-api.service';
import {PlayersService} from '../../players/players.service';
import {MembersService} from '../../admin/services/members.service';
import {DuplicatePlayerError} from '../../players/errors/duplicate-player-error';
import {SpinnerService} from '../../spinner.service';
import {Statistics} from '../../players/models/player.model';
import {Router} from '@angular/router';
import {NavigationService} from '../../shared/navigation/navigation.service';
import {FormArray, FormBuilder, Validators} from '@angular/forms';

export interface NewPlayer {
  name: string;
  rating: number;
  email?: string;
  isGuest: boolean;
  isActive?: boolean;
  statistics: Statistics;
}

@Injectable()
export class RegisterPlayersService {

  registerPlayersApiService = inject(RegisterPlayersApiService);
  popupsService = inject(PopupsService);
  playersService = inject(PlayersService);
  membersService = inject(MembersService);
  navigationService = inject(NavigationService);
  router = inject(Router);
  private spinnerService = inject(SpinnerService);
  private popoutService = inject(PopupsService);
  fb = inject(FormBuilder);
  form = signal(this.fb.group({
    players: this.fb.array([this.createPlayerRow()])
  }))

  players = linkedSignal(() => this.form().get('players') as FormArray)

  columns = signal([
    {name: 'Name', isRequired: true},
    {name: 'Rating', isRequired: true},
    {name: 'Email', isRequired: false},
    {name: 'Guest', isRequired: false},
    {name: '', isRequired: false},
  ])

  createPlayerRow() {
    return this.fb.group({
      name: ['', Validators.required],
      rating: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
      email: ['', Validators.email],
      isGuest: [false]
    });
  }

  addRow() {
    this.players.update((players) => {
      players.push(this.createPlayerRow());
      return players;
    })
  }

  removeRow(index: number) {
    if (this.players().length > 1) {
      this.players.update(players => {
        players.removeAt(index);
        return players
      })
    }
  }

  async submit() {
    this.form().markAllAsTouched();
    if (this.form().valid) {
      await this.addNewPlayers(this.players().value);
    }
  }

  checkUniqueNamesAndEmails(players: NewPlayer[]): {isValid: boolean, duplicates: string} {
    const seenNames = new Set<string>();
    const seenEmails = new Set<string>();
    const duplicates: string[] = [];

    players.forEach((p, idx) => {
      const nameKey = p.name?.trim().toLowerCase();
      const emailKey = p.email?.trim().toLowerCase();

      if (nameKey && seenNames.has(nameKey)) {
        duplicates.push(`Duplicate name "${p.name}" at row ${idx + 1}`);
      }
      seenNames.add(nameKey);

      if (emailKey && seenEmails.has(emailKey)) {
        duplicates.push(`Duplicate email "${p.email}" at row ${idx + 1}`);
      }
      if (emailKey) seenEmails.add(emailKey);
    });

    if (duplicates.length) {
      return {
        isValid: false,
        duplicates: duplicates.join('\n')
      };
    }
    return {
      isValid: true,
      duplicates: ''
    };
  }

  async addNewPlayers(newPlayersDetails: NewPlayer[]) {
    const uniqueCheck = this.checkUniqueNamesAndEmails(newPlayersDetails);
    if(!uniqueCheck.isValid) {
      this.popupsService.addErrorPopOut(uniqueCheck.duplicates);
      return;
    }
    try {
      this.spinnerService.setIsLoading(true);
      await this.addPlayers(newPlayersDetails);
      await this.addMembers(newPlayersDetails);
      this.navigationService.unlockNavigation();
      this.router.navigate(['home', 'game'])
    } catch (error: any) {
      if (error instanceof DuplicatePlayerError) {
        this.popoutService.addErrorPopOut(error.message);
      } else {
        this.popoutService.addErrorPopOut('An Error occurred, please try again later.');
      }
    } finally {
      this.spinnerService.setIsLoading(false);
    }
  }

  async addPlayers(newPlayersDetails: NewPlayer[]) {
    const newPlayers = newPlayersDetails.map((p =>
      ({...p, name: p.name.trim().toLowerCase(), isActive: true, statistics: {} as Statistics})));
    const addedPlayers = await this.registerPlayersApiService.addPlayersToGroup(this.playersService.selectedGroup().id, newPlayers);
    this.playersService.addPlayersSignal(addedPlayers);
    this.popupsService.addSuccessPopOut(
      `${newPlayersDetails.length > 1
        ? 'Players added successfully'
        : `${newPlayersDetails[0].name} added successfully`}`
    );
  }

  async addMembers(newPlayersDetails: NewPlayer[]) {
    const emails = [...new Set(
      newPlayersDetails
        .map(p => p.email?.trim().toLowerCase())
        .filter(email => !!email)
    )] as string[];
    await this.membersService.addMembers(this.playersService.selectedGroup().id, emails);
  }

  lockNavigation() {
    this.navigationService.lockNavigation();
  }
}
