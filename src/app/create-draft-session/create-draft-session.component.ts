import {Component, computed, inject, input, OnDestroy, OnInit, signal} from '@angular/core';
import {CreateDraftSessionService} from './services/create-draft-session.service';
import {log} from '@angular-devkit/build-angular/src/builders/ssr-dev-server';
import {FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {RangePipe} from '../pipes/range.pipe';
import {startWith, Subject, takeUntil} from 'rxjs';
import {CommonModule} from '@angular/common';
import {Player} from "../players/models/player.model";

@Component({
  selector: 'app-create-draft-session',
  imports: [FormsModule, RangePipe, ReactiveFormsModule, CommonModule],
  templateUrl: './create-draft-session.component.html',
  styleUrl: './create-draft-session.component.scss'
})
export class CreateDraftSessionComponent implements OnDestroy{

  createDraftSessionService = inject(CreateDraftSessionService);
  existingSessions = input<any[]>();

  existingOpenSessions = computed(() => {
    const existingSessions = this.existingSessions();
    if(existingSessions && existingSessions.length > 0) {
      return this.createDraftSessionService.buildUrl(existingSessions[0].id);
    }
    return undefined;
  })

  private playerDestroyMap = new Map<number, Subject<void>>();

  inviteUrl = signal('');

  form!: FormGroup;


  get captains(): FormArray {
    return this.form.get('captains') as FormArray;
  }


  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      numberOfTeams: [this.createDraftSessionService.numberOfTeams()],
      captains: this.fb.array([]),
    });
    this.form.get('numberOfTeams')!.valueChanges.pipe((startWith(this.form.get('numberOfTeams')!.value))).subscribe((value: number) => {
      this.setNumberOfTeams(value);
      this.createDraftSessionService.numberOfTeams.set(this.form.get('numberOfTeams')?.value);
    });
    // this.form.valueChanges.subscribe((value: any) => {
    //   console.log(value)
    //   this.setNumberOfTeams(value.numberOfTeams);
    //
    // })
  }

  setNumberOfTeams(n: number) {
    const currentLength = this.captains.length;

    // Add new groups if needed
    for (let i = currentLength; i < n; i++) {
      const destroy$ = new Subject<void>();
      this.playerDestroyMap.set(i, destroy$);

      const group = this.fb.group({
        captainEmail: '',
        player: ''
      });

      group.get('player')!.valueChanges
        .pipe(takeUntil(destroy$), startWith(group.get('player')!.value))
        .subscribe(value => {
          console.log(`Player ${i} changed:`, value);
          debugger;
          this.createDraftSessionService.updateCaptainsOptions(this.captains.getRawValue());
        });

      this.captains.push(group);
    }

    // Remove extra groups if needed
    for (let i = currentLength - 1; i >= n; i--) {
      this.playerDestroyMap.get(i)?.next();
      this.playerDestroyMap.get(i)?.complete();
      this.playerDestroyMap.delete(i);
      console.log('deleted subscrip')
      this.captains.removeAt(i);
    }
    this.createDraftSessionService.updateCaptainsOptions(this.captains.getRawValue());
  }



  async submit() {
    // const playersArray = Array.from(this.selectedPlayers);
    // console.log('Selected players:', playersArray);
    // console.log('number of teams:', this.numberOfTeams);
    // const id = await this.createDraftSessionService.createSession(['aricrachmany@gmail.com','aricrach8@gmail.com'], 2, playersArray);
    // this.inviteUrl.set(this.createDraftSessionService.buildUrl(id));
    console.log(this.form.getRawValue());
  }

  ngOnDestroy() {
    this.playerDestroyMap.forEach(sub => {
      sub.next();
      sub.complete();
    });
    this.playerDestroyMap.clear();
  }
  comparePlayers = (a: Player, b: Player) => a?.id === b?.id;
}
