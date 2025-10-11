import {inject, Injectable} from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {filter, map, Observable} from 'rxjs';
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
      map(() => {
        const breadcrumbs: Breadcrumb[] = [];
        let currentRoute = this.route.root;
        let url = '/home';

        while (currentRoute.firstChild) {
          currentRoute = currentRoute.firstChild;

          const routeSnapshot = currentRoute.snapshot;
          const routeConfig = routeSnapshot.routeConfig;

          if (routeConfig?.data?.['breadcrumb']) {
            url += '/' + routeSnapshot.url.map(segment => segment.path).join('/');
            breadcrumbs.push({
              label: routeConfig.data['breadcrumb'],
              url
            });
          }
        }

        return breadcrumbs;
      })
    );
  }
}
