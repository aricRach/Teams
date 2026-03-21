import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  Firestore,
  orderBy,
  query,
  serverTimestamp,
  where,
  Timestamp
} from "@angular/fire/firestore";
import { PlayersService } from "../players/players.service";
import { UserService } from "../user/user.service";
import { environment } from "../../environments/environment";

@Injectable({ providedIn: 'root' })
export class MediaService {
  private firestore = inject(Firestore);
  private playersService = inject(PlayersService);
  private userService = inject(UserService);

  private cloudName = environment.storageCloudName;
  private uploadPreset = environment.storageUploadPreset;

  //Uploads file to Cloudinary
  upload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', `groups/${this.playersService.selectedGroup().id}/photos`);

    return fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`, {
      method: 'POST',
      body: formData
    }).then(res => res.json());
  }

  async saveGroupAsset(cloudinaryRes: any) {
    const groupId = this.playersService.selectedGroup().id;
    const ref = collection(this.firestore, `groups/${groupId}/assets`);

    await addDoc(ref, {
      url: cloudinaryRes.secure_url,
      publicId: cloudinaryRes.public_id,
      type: cloudinaryRes.resource_type,
      createdAt: serverTimestamp(),
      createdBy: this.userService.user()?.displayName || ''
    });
  }

  getGroupAssets() {
    const groupId = this.playersService.selectedGroup().id;
    const ref = collection(this.firestore, `groups/${groupId}/assets`);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thresholdTimestamp = Timestamp.fromDate(sevenDaysAgo);

    const recentQuery = query(
      ref,
      where('createdAt', '>=', thresholdTimestamp),
      orderBy('createdAt', 'desc')
    );

    return collectionData(recentQuery, { idField: 'id' });
  }
}
