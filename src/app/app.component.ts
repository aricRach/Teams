import {Component, inject, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {SpinnerService} from './spinner.service';
import {SpinnerComponent} from '../../../ui-elements/dist/ui';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SpinnerComponent],
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})

export class AppComponent{
  spinnerService = inject(SpinnerService);
}
