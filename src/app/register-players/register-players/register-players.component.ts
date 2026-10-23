import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {FormLayoutComponent} from '../../shared/layouts/form-layout/form-layout.component';
import {ReactiveFormsModule} from '@angular/forms';

import {RegisterPlayersService} from '../services/register-players.service';
import {PLAYER_NAME_MAX_LENGTH} from '../../players/models/player.model';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-register-players',
  imports: [ReactiveFormsModule, FormLayoutComponent],
  templateUrl: './register-players.component.html',
  styleUrl: './register-players.component.scss',
  providers: [RegisterPlayersService]
})
export class RegisterPlayersComponent implements OnInit{

  readonly playerNameMaxLength = PLAYER_NAME_MAX_LENGTH;
  private destroyRef = inject(DestroyRef);

  registerPlayersService = inject(RegisterPlayersService)

  ngOnInit(): void {
    this.registerPlayersService.form()
      .valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.registerPlayersService.lockNavigation();
      });
  }
}
