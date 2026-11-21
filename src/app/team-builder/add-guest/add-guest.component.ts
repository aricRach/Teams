import {Component, inject, output} from '@angular/core';
import {ModalComponent} from '../../../modals/modal/modal.component';
import {AddGuestService} from './add-guest.service';

@Component({
  selector: 'app-add-guest',
  standalone: true,
  imports: [ModalComponent],
  providers: [AddGuestService],
  templateUrl: './add-guest.component.html',
  styleUrl: './add-guest.component.scss',
})
export class AddGuestComponent {
  protected addGuestService = inject(AddGuestService);
  closed = output();
}
