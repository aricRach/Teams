import {inject, Injectable} from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {filter, map, Observable, startWith} from 'rxjs';
import {Breadcrumb} from 'ui';

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbsService {

  private router = inject(Router);
  private route = inject(ActivatedRoute);

  getBreadcrumbs(): Observable<Breadcrumb[]> {
    return this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      // On a hard refresh the first NavigationEnd fires before the subscriber exists,
      // so build the breadcrumbs once immediately from the current route too.
      startWith(null),
      map(() => this.buildBreadcrumbs())
    );
  }

  private buildBreadcrumbs(): Breadcrumb[] {
    const breadcrumbs: Breadcrumb[] = [];
    let currentRoute = this.route.root;
    let url = '';

    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;

      const routeSnapshot = currentRoute.snapshot;
      const routeConfig = routeSnapshot.routeConfig;

      // Build the URL from every route (incl. home/:groupId), not only the ones with a breadcrumb.
      if (routeSnapshot.url.length) {
        url += '/' + routeSnapshot.url.map(segment => segment.path).join('/');
      }

      if (routeConfig?.data?.['breadcrumb']) {
        breadcrumbs.push({
          label: routeConfig.data['breadcrumb'],
          url
        });
      }
    }

    return breadcrumbs;
  }
}
