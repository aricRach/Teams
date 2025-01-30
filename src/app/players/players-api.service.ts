import {inject, Injectable} from '@angular/core';
import {addDoc, collection, collectionData, Firestore} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class PlayersApiService {

  firestore = inject(Firestore);
  itemCollection = collection(this.firestore, 'players');

  getPlayers() {
    return collectionData<any>(this.itemCollection);
  }

  async addPlayer(player: any) {
    try {
      await addDoc(this.itemCollection, player);
      console.log('Player added successfully');
    } catch (error) {
      console.error('Error adding player: ', error);
    }
  }

  constructor() { }
}
