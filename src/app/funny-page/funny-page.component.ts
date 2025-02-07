import {Component, ElementRef, inject, ViewChild} from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-funny-page',
  imports: [],
  templateUrl: './funny-page.component.html',
  standalone: true,
  styleUrl: './funny-page.component.scss'
})
export class FunnyPageComponent  {

  router = inject(Router);
  @ViewChild('movingButton', { static: false }) movingButton!: ElementRef<HTMLButtonElement>;

  moveButton() {
    if (this.movingButton) {
      const button = this.movingButton.nativeElement;

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      const buttonWidth = button.offsetWidth;
      const buttonHeight = button.offsetHeight;

      const randomX = Math.random() * (screenWidth - buttonWidth);
      const randomY = Math.random() * (screenHeight - buttonHeight);
      button.style.position = 'absolute';
      button.style.left = `${randomX}px`;
      button.style.top = `${randomY}px`;
    }
  }

  navigateToApp() {
    this.router.navigate(['/home']);
  }
}
