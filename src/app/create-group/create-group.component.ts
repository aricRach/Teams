import { Component, inject } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { CreateGroupService } from './create-group.service';

@Component({
  selector: 'app-create-group',
  standalone: true,
  imports: [FormField, RouterLink],
  providers: [CreateGroupService],
  templateUrl: './create-group.component.html',
  styleUrl: './create-group.component.scss'
})
export class CreateGroupComponent {
  protected createGroupService = inject(CreateGroupService);
}
