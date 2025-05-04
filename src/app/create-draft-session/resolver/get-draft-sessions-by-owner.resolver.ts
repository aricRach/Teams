import {ResolveFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {CreateDraftSessionService} from '../services/create-draft-session.service';
import {SpinnerService} from '../../spinner.service';

export const getDraftSessionsByOwnerResolver: ResolveFn<Promise<any>> = (route, state) => {

  const createDraftSessionService = inject(CreateDraftSessionService);
  return createDraftSessionService.getSessionsByCreator()
};
