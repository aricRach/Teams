import {Component, inject, input} from '@angular/core';
import {ModalsService, NavigationBarComponent} from 'ui'
import {UserService} from '../user/user.service';
import {FormsModule} from '@angular/forms';
import {ModalComponent} from '../../modals/modal/modal.component';
import {AdminControlComponent} from '../admin/admin-control/admin-control.component';

@Component({
  selector: 'app-header',
  imports: [NavigationBarComponent, FormsModule, ModalComponent],
  providers: [UserService],
  templateUrl: './header.component.html',
  standalone: true,
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  modalsService = inject(ModalsService);

  title = input<string>('TeamsRach');
  navItems = input<any[]>([]);
  isAdmin = input<boolean>(false);

  openAdminControl() {
    const dialogRef = this.modalsService.openComponentModal(AdminControlComponent, {
      width: 300,
      height: 400,
    });
    // @ts-ignore
    dialogRef.componentInstance.submitted.subscribe(() => {
      dialogRef.close();
    });
  }
}
