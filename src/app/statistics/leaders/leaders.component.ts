import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {DataLayoutComponent} from '../../shared/layouts/data-layout/data-layout.component';
import {LeadersService} from './leaders.service';

@Component({
  selector: 'app-leaders',
  imports: [RouterLink, DataLayoutComponent],
  providers: [LeadersService],
  templateUrl: './leaders.component.html',
  styleUrl: './leaders.component.scss'
})
export class LeadersComponent {
  protected leadersService = inject(LeadersService);
}
