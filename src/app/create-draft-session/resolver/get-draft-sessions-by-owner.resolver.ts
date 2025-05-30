import {ResolveFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {CreateDraftSessionService} from '../services/create-draft-session.service';
import {SpinnerService} from '../../spinner.service';

export const getDraftSessionsByOwnerResolver: ResolveFn<Promise<any>> = async (route, state) => {

  const createDraftSessionService = inject(CreateDraftSessionService);
  const sessions = await createDraftSessionService.getSessionsByCreator();
  return sessions ? sessions[0] : null;
};
