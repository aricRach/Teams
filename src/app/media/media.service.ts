import { Injectable, inject } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {addDoc, collection, collectionData, Firestore, orderBy, query, serverTimestamp} from "@angular/fire/firestore";
import {PlayersService} from "../players/players.service";
import {UserService} from "../user/user.service";
import {environment} from "../../environments/environment";

@Injectable({ providedIn: 'root' })
export class MediaService {
  http = inject(HttpClient);
  private firestore = inject(Firestore);
  private playersService = inject(PlayersService);
  private userService = inject(UserService);

  private cloudName = environment.storageCloudName;
  private uploadPreset = environment.storageUploadPreset;

  upload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', `groups/${this.playersService.selectedGroup().id}/photos`);

    // using fetch to avoid headers that added in the interceptor - cloudinary rejects extra auth headers
    return fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`, {
      method: 'POST',
      body: formData
    }).then(res => res.json());
  }

  async saveGroupAsset(
      cloudinaryRes: any,
  ) {
    const ref = collection(this.firestore, `groups/${this.playersService.selectedGroup().id}/assets`); // change to selected group id

    await addDoc(ref, {
      url: cloudinaryRes.secure_url,
      publicId: cloudinaryRes.public_id,
      type: cloudinaryRes.resource_type,
      createdAt: serverTimestamp(),
      createdBy: this.userService.user()?.displayName || ''
    });
  }

  getGroupAssets() {
    const ref = collection(this.firestore, `groups/${this.playersService.selectedGroup().id}/assets`);
    const q = query(ref, orderBy('createdAt', 'desc'));

    return collectionData(q, { idField: 'id' });
  }
}
