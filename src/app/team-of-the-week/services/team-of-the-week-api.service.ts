import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {doc, Firestore, getDoc, setDoc} from '@angular/fire/firestore';
import {firstValueFrom} from 'rxjs';
import {PlayersService} from '../../players/players.service';

@Injectable({
  providedIn: 'root'
})
export class TeamOfTheWeekApiService {

  private firestore = inject(Firestore);
  playersService = inject(PlayersService);
  httpClient = inject(HttpClient);
  baseUrl = `${environment.gatewayServiceBaseUrl}/team-of-the-week`;
  async generateAiTotw(
    date: string,
    players: any[],
    teamSize: number,
    createNew?: boolean
  ): Promise<any> {
    const ref = doc(
      this.firestore,
      `groups/${this.playersService.selectedGroup().id}/teamOfTheWeek/${date}`
    );
    try {
    if(!createNew) {
      const snapshot = await getDoc(ref);
      const snapshotData = snapshot.data();
      if (snapshot.exists() && snapshotData && !snapshotData?.['shouldUpdate']) {
        return snapshotData;
      }
    }
      const totwData: any = await firstValueFrom(this.httpClient.post(this.baseUrl, {players, teamSize}));

      // Fire and forget
      setDoc(ref, {...totwData, shouldUpdate: false}).catch(() => console.error('cant save'));

      return totwData;
    } catch (err) {
      console.error('Error generating team of the week:', err);
      throw err;
    }
  }

  async markTotwDateNotUpdated(date: string) {
    const ref = doc(
      this.firestore,
      `groups/${this.playersService.selectedGroup().id}/teamOfTheWeek/${date}`
    );
    await setDoc(ref, { shouldUpdate: true }, { merge: true });
  }
}
