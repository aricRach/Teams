import {Component, ElementRef, inject, OnInit, ViewChild, viewChild} from '@angular/core';
import {MediaService} from '../media.service';
import {AsyncPipe, CommonModule} from "@angular/common";
import {ModalsService, PopupsService} from 'ui';

@Component({
  selector: 'app-capture-media',
  imports: [AsyncPipe, CommonModule],
  templateUrl: './capture-media.component.html',
  styleUrl: './capture-media.component.scss'
})
export class CaptureMediaComponent {

  mediaService = inject(MediaService);
  modalsService = inject(ModalsService);
  popupsService = inject(PopupsService);
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    maxSizeMB = 20;

  @ViewChild('mediaInput') mediaInput!: ElementRef<HTMLInputElement>;

  async onSelect(event: Event) {
      const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

      if (file.size > this.maxSizeMB * 1024 * 1024) {
        this.popupsService.addErrorPopOut(`File is too large. Maximum size is ${this.maxSizeMB} MB.`)
        this.resetInput();
        return;
      }
      if (!this.allowedTypes.includes(file.type)) {
        this.popupsService.addErrorPopOut(`Invalid file type. Allowed types: ${this.allowedTypes.join(', ')}`)
        this.resetInput();
        return;
      }
    const previewUrl = URL.createObjectURL(file);

    this.modalsService.openMediaPreviewModal({
      title: 'Save media?',
      extraData: {
        url: previewUrl,
        type: file.type.startsWith('video') ? 'video' : 'image',
      }
    }).afterClosed().subscribe((confirm) => {
        if(!confirm) {
          this.resetInput();
          return;
        }
          this.mediaService.upload(file)
            .then((res: any) => {
              console.log('Uploaded:', {
                url: res.secure_url,
                publicId: res.public_id,}
              );
              this.mediaService.saveGroupAsset(res).then(() => {
                console.log('Uploaded');
                this.popupsService.addSuccessPopOut('Uploaded successfully.');
              })
            }).finally(() => {
            this.resetInput();
          });
      })
  }

  resetInput() {
    this.mediaInput.nativeElement.value = '';
  }
}
