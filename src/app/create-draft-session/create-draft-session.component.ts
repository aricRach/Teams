import {Component, computed, inject, input, linkedSignal, OnDestroy} from '@angular/core';
import {CreateDraftSessionService, TeamDraftSession} from './services/create-draft-session.service';
import {FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {RangePipe} from '../pipes/range.pipe';
import {startWith, Subject, takeUntil} from 'rxjs';
import {CommonModule} from '@angular/common';
import {Player} from "../players/models/player.model";
import {shuffleArray} from "../utils/array-utils";
import {RouterModule} from '@angular/router';
import {MatTooltipModule} from '@angular/material/tooltip';

@Component({
  selector: 'app-create-draft-session',
  imports: [FormsModule, RangePipe, ReactiveFormsModule, CommonModule, RouterModule, MatTooltipModule],
  providers: [CreateDraftSessionService],
  templateUrl: './create-draft-session.component.html',
  styleUrl: './create-draft-session.component.scss'
})
export class CreateDraftSessionComponent implements OnDestroy{

  createDraftSessionService = inject(CreateDraftSessionService);

  existingSession = input<TeamDraftSession>();

  sessionUrlToShow = linkedSignal(() => {
    const existingSession = this.existingSession() || '';
    if(existingSession) {
      return this.createDraftSessionService.buildUrl(existingSession.id);
    }
    return '';
  });
  activeSession = linkedSignal(() => {
    return  this.existingSession()?.id || '';
  })
  sessionRouterLink = computed(() => {
    const url = this.sessionUrlToShow();
    if(!url) {
      return  '';
    }
    const hashPrefix = '/#';
    const index = url.indexOf(hashPrefix);
    return index !== -1 ? url.slice(index + hashPrefix.length) : url;
  })

  private playerDestroyMap = new Map<number, Subject<void>>();
  form!: FormGroup;

  get captains(): FormArray {
    return this.form.get('captains') as FormArray;
  }

  get notValid() {
    return this.form.invalid || this.createDraftSessionService.checkedPlayers.size == 0
  }

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      numberOfTeams: [this.createDraftSessionService.numberOfTeams()],
      captains: this.fb.array([]),
      isSnakeMode: [false]
    });
    this.form.get('numberOfTeams')!.valueChanges.pipe((startWith(this.form.get('numberOfTeams')!.value))).subscribe((value: number) => {
      this.setNumberOfTeams(value);
    });
  }

  setNumberOfTeams(numberOfTeams: number) {
    const currentLength = this.captains.length;

    // Add new groups if needed
    for (let i = currentLength; i < numberOfTeams; i++) {
      const destroy$ = new Subject<void>();
      this.playerDestroyMap.set(i, destroy$);

      const group = this.fb.group({
        captainEmail: ['', [Validators.required,Validators.email]],
        player: ['', Validators.required],
      });

      group.get('player')!.valueChanges
        .pipe(takeUntil(destroy$), startWith(group.get('player')!.value))
        .subscribe(value => {
          if(value) {
            this.createDraftSessionService.updateCaptainsOptions(this.captains.getRawValue());
            // @ts-ignore
            group.patchValue({ captainEmail: value.email || '' });
          }
        });

      this.captains.push(group);
    }

    // Remove extra groups if needed
    for (let i = currentLength - 1; i >= numberOfTeams; i--) {
      this.playerDestroyMap.get(i)?.next();
      this.playerDestroyMap.get(i)?.complete();
      this.playerDestroyMap.delete(i);
      this.captains.removeAt(i);
    }

    this.createDraftSessionService.updateCaptainsOptions(this.captains.getRawValue());
    this.createDraftSessionService.numberOfTeams.set(numberOfTeams);
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
   const formValue = this.form.getRawValue();
   const sessionId  = await this.createDraftSessionService.createSession(shuffleArray(formValue.captains), formValue.isSnakeMode);
   this.activeSession.set(sessionId);
   this.sessionUrlToShow.set(this.createDraftSessionService.buildUrl(sessionId));
  }

  comparePlayers = (a: Player, b: Player) => a?.id === b?.id;

  ngOnDestroy() {
    this.playerDestroyMap.forEach(sub => {
      sub.next();
      sub.complete();
    });
    this.playerDestroyMap.clear();
  }
}
