import {Component, computed, inject, input, signal} from '@angular/core';
import {PlayersService} from '../players/players.service';
import {FormsModule} from '@angular/forms';
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
  router = inject(Router);
  private auth = inject(Auth);
  isAdmin = computed(() => this.playersService.isAdmin())
  groupChangedSubmitted = signal(false);
  selectedGroup!: {admins: string[], id: string, createdBy: string};
  numberOfTeams = 3;

  private get currentUserEmail(): string | null {
    return this.auth.currentUser?.email ?? null;
  }

  setSelectedGroup() {
    const email = this.currentUserEmail;
    if (email) {
      this.groupChangedSubmitted.set(true);
      this.playersService.selectGroup(this.selectedGroup, email);
    }
  }

  submit() {
    const email = this.currentUserEmail;
    if (email) {
      this.playersService.setNumberOfTeams(this.numberOfTeams);;
      const route = this.selectedGroup.admins.includes(email) ? ['home', 'game'] : ['home', 'statistics'];
      this.router.navigate(route);
    }
  }

  logout() {
    this.auth.signOut().then(() => {
      this.router.navigate(['/']);
    });
  }
}
