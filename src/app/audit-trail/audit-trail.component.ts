import {Component, inject} from '@angular/core';
import {AuditTrailService} from './services/audit-trail.service';


@Component({
  selector: 'app-audit-trail',
  imports: [],
  templateUrl: './audit-trail.component.html',
  standalone: true,
  styleUrl: './audit-trail.component.scss'
})
export class AuditTrailComponent {
  auditTrailService = inject(AuditTrailService);
}
