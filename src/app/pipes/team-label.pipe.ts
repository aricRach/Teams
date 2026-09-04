import { Pipe, PipeTransform } from '@angular/core';
import { formatTeamLabel } from '../utils/team-label.util';

@Pipe({
  standalone: true,
  name: 'teamLabel'
})
export class TeamLabelPipe implements PipeTransform {

  transform(teamKey: string, aliases?: Record<string, string> | null): string {
    return formatTeamLabel(teamKey, aliases?.[teamKey]);
  }

}
