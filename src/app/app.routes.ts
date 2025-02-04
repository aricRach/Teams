import { Routes } from '@angular/router';
import {StatisticsComponent} from './statistics/statistics.component';
import {GameComponent} from './game/game.component';

export const routes: Routes = [
  {
    path: '',
    component: GameComponent,
  },
  {
    path: 'statistics',
    component: StatisticsComponent,
  }
];
