import { Component, inject } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { CreateGroupService } from './create-group.service';
import { FormLayoutComponent } from '../shared/layouts/form-layout/form-layout.component';

@Component({
  selector: 'app-create-group',
  standalone: true,
  imports: [FormField, RouterLink, FormLayoutComponent],
  providers: [CreateGroupService],
  templateUrl: './create-group.component.html',
  styleUrl: './create-group.component.scss'
})
export class CreateGroupComponent {
  protected createGroupService = inject(CreateGroupService);
}
