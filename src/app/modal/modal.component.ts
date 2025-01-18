import {Component, input, output} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-modal',
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  standalone: true,
  styleUrl: './modal.component.scss'
})
export class ModalComponent {

  isVisible = input(false);
  showCloseButton = input(true);
  showCloseIcon = input(true);
  showSubmitButton = input(true);
  close = output();
  submit = output();

  closeModal(): void {
    this.close.emit();
  }

  submitModal(): void {
    this.submit.emit();
  }
}
