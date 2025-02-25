import {Component, inject, input} from '@angular/core';
import {PlayersService} from '../players/players.service';
import {FormsModule} from '@angular/forms';
import {UserService} from '../user/user.service';
import {Router} from '@angular/router';
import {Auth} from '@angular/fire/auth';

@Component({
  selector: 'app-select-group',
  imports: [
    FormsModule],
  templateUrl: './select-group.component.html',
  standalone: true,
  styleUrl: './select-group.component.scss'
})
export class SelectGroupComponent {

  groups = input<any[]>();
  playersService = inject(PlayersService);
  usersService = inject(UserService);
  router = inject(Router);
  private auth = inject(Auth);

  selectedGroup!: {admins: string[], id: string};


  setSelectedGroup() {
    const user = this.auth.currentUser;
    if(user && user.email) {
      this.playersService.selectedGroup.set(this.selectedGroup);
      if(this.selectedGroup.admins.includes(user.email)) {
        this.playersService.isAdmin.set(true);
        this.router.navigate(['/home', 'game']);
      } else {
        this.playersService.isAdmin.set(false);
        this.router.navigate(['/home', 'statistics']);
      }
    }
  }
}
