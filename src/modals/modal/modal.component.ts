import {Component, input, output} from '@angular/core';


@Component({
  selector: 'app-modal',
  imports: [],
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
}
