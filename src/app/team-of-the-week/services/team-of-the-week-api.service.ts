import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {PlayerWeekStates} from './team-of-the-week.service';
import {doc, Firestore, getDoc, setDoc} from '@angular/fire/firestore';
import {of, tap} from 'rxjs';
import {PlayersService} from '../../players/players.service';

@Injectable({
  providedIn: 'root'
})
export class TeamOfTheWeekApiService {

  private firestore = inject(Firestore);
  playersService = inject(PlayersService);
  httpClient = inject(HttpClient);
  baseUrl = 'https://teams-backend-getway.onrender.com/team-of-the-week';

  async generateAiTotw(
    date: string, // e.g., '2024-04-05'
    data: any[]
  ): Promise<{ existed: boolean; data: any }> {
    let totwAiData = {} as { existed: boolean; data: any };
    const ref = doc(this.firestore, `groups/${this.playersService.selectedGroup().id}/teamOfTheWeek/${date}`);
    const snapshot = await getDoc(ref);

    // if (snapshot.exists()) {
    //   const existingData = snapshot.data();
    //   return { existed: true, data: existingData };
    // }
    this.httpClient.post(this.baseUrl, data)
      .pipe(tap(async (totwData: any) => {
        totwAiData = totwData
        console.log(totwAiData)
        await setDoc(ref, totwData)
      })).subscribe()
    // @ts-ignore
    return { existed: false, totwAiData };
  }
}
