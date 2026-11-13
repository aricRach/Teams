import {Component, inject, input} from '@angular/core';
import {PlayersService} from '../players/players.service';
import {FormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {Auth} from '@angular/fire/auth';
import {environment} from '../../environments/environment';

@Component({
  selector: 'app-select-group',
  imports: [FormsModule, RouterLink],
  templateUrl: './select-group.component.html',
  standalone: true,
  styleUrl: './select-group.component.scss'
})
export class SelectGroupComponent {

  groups = input<any[]>();
  playersService = inject(PlayersService);
  router = inject(Router);
  private auth = inject(Auth);
  isSuperAdmin = this.auth.currentUser?.email === environment.superAdminEmail;
  selectedGroup!: {admins: string[], id: string, createdBy: string};

  private get currentUserEmail(): string | null {
    return this.auth.currentUser?.email ?? null;
  }

  submit() {
    const email = this.currentUserEmail;
    if (email) {
      this.playersService.selectGroup(this.selectedGroup, email);
      const page = this.selectedGroup.admins.includes(email) ? 'game' : 'statistics';
      const route = ['/home', this.selectedGroup.id, page];
      this.router.navigate(route);
    }
  }

  logout() {
    this.auth.signOut().then(() => {
      this.router.navigate(['/']);
    });
  }
}
