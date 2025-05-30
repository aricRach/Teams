import {inject, Injectable} from '@angular/core';
import {collection, deleteDoc, doc, docData, Firestore, getDoc, updateDoc} from '@angular/fire/firestore';
import {Observable} from 'rxjs';
import {Auth} from '@angular/fire/auth';
import {PlayersService} from '../../players/players.service';
import {shuffleArray} from '../../utils/array-utils';
import {Router} from '@angular/router';
import {PopupsService} from 'ui';

@Injectable({
  providedIn: 'root'
})
export class TeamDraftService {
  auth = inject(Auth);
  private firestore = inject(Firestore);
  router = inject(Router);
  popupsService = inject(PopupsService);

  getSession(sessionId: string, groupId: string): Observable<any> {
    const ref = doc(this.firestore, `groups/${groupId}/teamDraftSessions/${sessionId}`);
    return docData(ref, { idField: 'id' });
  }

  async assignPlayer(sessionId: string, groupId: string, player: {id: string, name: string}, teamKey: string) {
    const ref = doc(this.firestore, `groups/${groupId}/teamDraftSessions/${sessionId}`);
    const snapshot = await getDoc(ref);
    const data = snapshot.data();

    if (!data){
      throw new Error('Session not found')
    }
    const isExist = data['unassignedPlayers'].some((p: {id: string, name: string}) => p.id === player.id)
    if (!isExist) {
      throw new Error('Player already assigned')
    }

    const currentUser = this.auth.currentUser?.email/* get current user's email from auth */;
    const turnEmail = data['members'][data['currentTurn']];

    if (currentUser !== turnEmail) {
      throw new Error("It's not your turn")
    }

    const newTeams = { ...data['teams'] };
    newTeams[teamKey] = [...(newTeams[teamKey] || []), player];

    const newUnassigned = data['unassignedPlayers'].filter((p: {id: string, name: string}) => p.id !== player.id);
    const nextTurnData = this.determineNextTurn(data);
    const newStatus = newUnassigned.length === 0 ? 'completed' : 'active';

    if(newStatus === 'completed') {
      // shuffle teams to avoid knowing level of each player.
      for(const teamKey in newTeams) {
        newTeams[teamKey] = shuffleArray(newTeams[teamKey]);
      }
    }

    await updateDoc(ref, {
      teams: newTeams,
      currentTurn: nextTurnData.nextTurn,
      unassignedPlayers: newUnassigned,
      selectionMethod: {
        isForward: nextTurnData.isForward,
        isSnakeMode: data['selectionMethod']['isSnakeMode']
      },
      status: newStatus
    });
  }

  determineNextTurn(data: any): {nextTurn: number, isForward: boolean | null} {

    let isForward = data['selectionMethod']['isForward'];
    const currentTurn = data['currentTurn'];
    const isSnakeMode = data['selectionMethod']['isSnakeMode'];
    const membersCount = data['members'].length;

    if(!isSnakeMode) {
      return {
        nextTurn: (currentTurn + 1) % data['members'].length,
        isForward: null,
      }
    }

    // snake
    let nextTurn: number;
    if (isForward) {
      if (currentTurn + 1 >= membersCount) {
        nextTurn = currentTurn;
        isForward = false;
      } else {
        nextTurn = currentTurn + 1;
      }
    } else {
      if (currentTurn - 1 < 0) {
        nextTurn = currentTurn;
        isForward = true;
      } else {
        nextTurn = currentTurn - 1;
      }
    }
    return {
      nextTurn,
      isForward
    }
  }
}
