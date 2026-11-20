import {Component, inject, input, output} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {NavigationBarComponent} from 'ui'
import {UserService} from '../user/user.service';
import {FormsModule} from '@angular/forms';
import {AdminControlComponent} from '../admin/admin-control/admin-control.component';

@Component({
  selector: 'app-header',
  imports: [NavigationBarComponent, FormsModule],
  providers: [UserService],
  templateUrl: './header.component.html',
  standalone: true,
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  private dialog = inject(MatDialog);

  title = input<string>('TeamsRach');
  navItems = input<any[]>([]);
  isAdmin = input<boolean>(false);
  showShare = input<boolean>(false);
  share = output<void>();

  openAdminControl() {
    // MatDialog directly (not ModalsService) so the height follows the content instead of a fixed box.
    // The dialog closes itself (AdminControlDialogService.close).
    this.dialog.open(AdminControlComponent, {
      width: '380px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
    });
  }
}
