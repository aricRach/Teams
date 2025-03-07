import {Component, inject, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {SpinnerService} from './spinner.service';
import {PopupsComponent, SpinnerComponent} from 'ui';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SpinnerComponent, PopupsComponent, CommonModule],
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})

export class AppComponent{
  spinnerService = inject(SpinnerService);
}
