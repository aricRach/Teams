import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {RegisterPlayersService} from '../services/register-players.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-register-players',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-players.component.html',
  styleUrl: './register-players.component.scss',
  providers: [RegisterPlayersService]
})
export class RegisterPlayersComponent implements OnInit{

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
