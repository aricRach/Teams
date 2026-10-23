import {Component, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {SpinnerService} from './spinner.service';
import {PopupsComponent} from 'ui';
import {TopProgressComponent} from './shared/top-progress/top-progress.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PopupsComponent, TopProgressComponent],
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})

export class AppComponent{
  spinnerService = inject(SpinnerService);
}
