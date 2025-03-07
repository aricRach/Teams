import {ApplicationConfig, provideZoneChangeDetection} from '@angular/core';
import {provideRouter, withComponentInputBinding, withHashLocation} from '@angular/router';

import { routes } from './app.routes';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import {environment} from '../environments/environment';
import {DatePipe} from '@angular/common';
import {provideAuth} from '@angular/fire/auth';
import {getAuth} from 'firebase/auth';
import {PopupsService} from 'ui';

export const appConfig: ApplicationConfig = {
  providers: [
    PopupsService,
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withHashLocation()),
      provideFirebaseApp(() => initializeApp(environment.firebase)),
      provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    DatePipe]
};
