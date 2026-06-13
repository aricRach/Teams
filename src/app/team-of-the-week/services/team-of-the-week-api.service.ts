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
      const snapshot = await getDoc(ref);
      const snapshotData = snapshot.data() ?? {};

      const totalTries: number = snapshotData['totalTries'] ?? 0;
      const lastGeneratedDay: string | null = snapshotData['lastGeneratedDay'] ?? null;
      const today = new Date().toISOString().slice(0, 10);

      if (!createNew && snapshot.exists() && snapshotData && !snapshotData['shouldUpdate']) {
        return snapshotData;
      }

      if (totalTries >= 5) {
        throw new Error('LIMIT_TOTAL');
      }
      if (createNew && lastGeneratedDay === today) {
        throw new Error('LIMIT_DAILY');
      }

      const totwData: any = await firstValueFrom(this.httpClient.post(this.baseUrl, {players, teamSize}));
      const result = {...totwData, shouldUpdate: false, totalTries: totalTries + 1, lastGeneratedDay: today};

      // Fire and forget
      setDoc(ref, result).catch(() => console.error('cant save'));

      return result;
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
