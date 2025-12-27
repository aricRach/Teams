import {Component, inject, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {MediaService} from '../media/media.service';
import {AsyncPipe} from '@angular/common';

@Component({
  selector: 'app-gallery',
  imports: [AsyncPipe],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss'
})
export class GalleryComponent implements OnInit{

  mediaService = inject(MediaService);

  assets$!: Observable<any[]>;

  async downloadAsset(asset: any) {
    try {
      const response = await fetch(asset.url);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      // Friendly filename
      const extension = asset.url.split('.').pop()?.split('?')[0] || 'file';
      link.href = url;
      link.download = `${asset.publicId}.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
    }
  }

  ngOnInit(): void {
    this.assets$ = this.mediaService.getGroupAssets();
  }
}
