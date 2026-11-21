import {inject, Injectable} from '@angular/core';
import {arrayRemove, arrayUnion, doc, Firestore, writeBatch} from '@angular/fire/firestore';
import {Player, TeamsOptions} from '../players/models/player.model';

@Injectable({
  providedIn: 'root'
})
export class TeamBuilderApiService {
  private firestore = inject(Firestore);

  /**
   * Clears players (inactive) or brings them back (active); either way they end up on the bench.
   * Players with an email lose or regain group access in the same batch, so it all succeeds or all fails.
   */
  async setPlayersActive(groupId: string, players: Player[], isActive: boolean): Promise<void> {
    const batch = writeBatch(this.firestore);
    for (const player of players) {
      batch.update(doc(this.firestore, `groups/${groupId}/players/${player.id}`), {isActive, team: TeamsOptions.AllPlayers});
    }
    const emails = players.map(player => player.email).filter((email): email is string => !!email);
    if (emails.length) {
      batch.update(doc(this.firestore, `groups/${groupId}`), {
        members: isActive ? arrayUnion(...emails) : arrayRemove(...emails),
      });
    }
    await batch.commit();
  }
}
