import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-group-not-found',
  imports: [RouterLink],
  standalone: true,
  template: `
    <div class="column-center group-not-found">
      <h3>Group not found</h3>
      <p>This link points to a group that doesn't exist anymore, or the link is incomplete.</p>
      <a routerLink="/select-group" class="active-btn action-btn">Go to my groups</a>
    </div>
  `,
  styles: `
    .group-not-found {
      padding: 40px 16px;
      text-align: center;
      gap: 12px;
    }
  `
})
export class GroupNotFoundComponent {}
