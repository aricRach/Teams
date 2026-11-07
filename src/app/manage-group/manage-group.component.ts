import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ManageGroupService } from './manage-group.service';
import { FormLayoutComponent } from '../shared/layouts/form-layout/form-layout.component';

@Component({
  selector: 'app-manage-group',
  standalone: true,
  imports: [RouterLink, FormLayoutComponent],
  providers: [ManageGroupService],
  templateUrl: './manage-group.component.html',
  styleUrls: ['../create-group/create-group.component.scss', './manage-group.component.scss']
})
export class ManageGroupComponent {
  protected manageGroupService = inject(ManageGroupService);
}
