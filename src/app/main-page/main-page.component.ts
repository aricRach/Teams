import {Component, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {HeaderComponent} from '../header/header.component';
import {RouterOutlet} from '@angular/router';
import {BreadcrumbsService} from '../shared/breadcrumbs/breadcrumbs.service';
import {BreadcrumbsComponent} from 'ui';
import {AsyncPipe} from '@angular/common';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-main-page',
  imports: [
    HeaderComponent,
    RouterOutlet,
    BreadcrumbsComponent,
    AsyncPipe
  ],
  templateUrl: './main-page.component.html',
  standalone: true,
  styleUrl: './main-page.component.scss'
})
export class MainPageComponent implements OnInit, OnDestroy {
  breadcrumbsService = inject(BreadcrumbsService);
  breadcrumbs = signal([]);

  subscription = new Subscription();

  ngOnInit() {
    this.subscription.add(this.breadcrumbsService.getBreadcrumbs().subscribe((a) => {
      this.breadcrumbs.set(a as any);
    }))
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
