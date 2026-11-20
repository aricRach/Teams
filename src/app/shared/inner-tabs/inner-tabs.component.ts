import {afterNextRender, Component, DestroyRef, ElementRef, inject, input, signal} from '@angular/core';
import {NavigationEnd, Params, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatTooltip} from '@angular/material/tooltip';
import {filter} from 'rxjs';

export interface InnerTab {
  title: string;
  link: string;
  tooltip: string;
  isDisabled: boolean;
  queryParams?: Params;
}
@Component({
  selector: 'app-inner-tabs',
  imports: [
    RouterLinkActive,
    MatTooltip,
    RouterLink
  ],
  templateUrl: './inner-tabs.component.html',
  standalone: true,
  styleUrl: './inner-tabs.component.scss'
})
export class InnerTabsComponent {
  tabs = input<InnerTab[]>();

  /** True when there are hidden tabs on that side; the row fades out there to show it can be swiped. */
  canScrollStart = signal(false);
  canScrollEnd = signal(false);

  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const row = this.row();
      if (!row) return;
      // Screen size changes can make the row start or stop overflowing.
      const resizeObserver = new ResizeObserver(() => this.updateFades());
      resizeObserver.observe(row);
      destroyRef.onDestroy(() => resizeObserver.disconnect());
      this.scrollActiveTabIntoView();
    });

    // When the row scrolls (small screens), keep the active tab in view.
    inject(Router).events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => setTimeout(() => this.scrollActiveTabIntoView()));
  }

  updateFades() {
    const row = this.row();
    if (!row) return;
    this.canScrollStart.set(row.scrollLeft > 2);
    this.canScrollEnd.set(row.scrollLeft + row.clientWidth < row.scrollWidth - 2);
  }

  private row() {
    return this.host.nativeElement.querySelector<HTMLElement>('.statistic-links');
  }

  private scrollActiveTabIntoView() {
    const row = this.row();
    const active = row?.querySelector<HTMLElement>('.active');
    this.updateFades();
    if (!row || !active || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({left: active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2, behavior: 'smooth'});
  }
}
