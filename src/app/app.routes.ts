import { Routes } from '@angular/router';
import {StatisticsComponent} from './statistics/statistics.component';
import {GameComponent} from './game/game.component';
import {FunnyPageComponent} from './funny-page/funny-page.component';
import {MainPageComponent} from './main-page/main-page.component';

export const routes: Routes = [
  // {
  //   path: '',
  //   component: GameComponent,
  // },
  {
    path: '',
    component: MainPageComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: GameComponent
      },
      {
        path: 'game',
        component: GameComponent,
      },
      {
        path: 'statistics',
        component: StatisticsComponent,
      }
    ]
  },
];
