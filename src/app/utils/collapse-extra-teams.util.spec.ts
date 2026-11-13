import { collapseExtraTeams, restoreHiddenTeams } from './collapse-extra-teams.util';
import { Player } from '../players/models/player.model';

const player = (id: string, team: string): Player => ({ id, name: id, team } as unknown as Player);

const makeTeams = () => ({
  allPlayers: { players: [player('p0', 'allPlayers')] },
  teamA: { players: [player('a1', 'teamA')] },
  teamB: { players: [player('b1', 'teamB')] },
  teamC: { players: [player('c1', 'teamC')] },
  teamD: { players: [player('d1', 'teamD'), player('d2', 'teamD')] },
});

describe('collapseExtraTeams', () => {
  it('moves players from team slots beyond the count into allPlayers', () => {
    const result = collapseExtraTeams(makeTeams(), 3);

    expect(result['teamC'].players.map(p => p.id)).toEqual(['c1']);
    expect(result['teamD'].players).toEqual([]);
    expect(result['allPlayers'].players.map(p => p.id)).toEqual(['p0', 'd1', 'd2']);
  });

  it('leaves the map untouched when every team slot is visible', () => {
    const teams = makeTeams();
    const result = collapseExtraTeams(teams, 4);

    expect(result).toBe(teams);
  });

  it('does not mutate the input', () => {
    const teams = makeTeams();
    collapseExtraTeams(teams, 2);

    expect(teams['teamC'].players.map(p => p.id)).toEqual(['c1']);
    expect(teams['teamD'].players.map(p => p.id)).toEqual(['d1', 'd2']);
    expect(teams['allPlayers'].players.map(p => p.id)).toEqual(['p0']);
  });

  it('collapses everything into the pool when count is 0', () => {
    const result = collapseExtraTeams(makeTeams(), 0);

    expect(result['teamA'].players).toEqual([]);
    expect(result['allPlayers'].players.map(p => p.id)).toEqual(['p0', 'a1', 'b1', 'c1', 'd1', 'd2']);
  });
});

describe('restoreHiddenTeams', () => {
  it('puts hidden players back in their teams after editing the collapsed view', () => {
    const original = makeTeams();
    const edited = collapseExtraTeams(original, 2);
    // drag p0 from the pool into teamA
    edited['teamA'].players.push(edited['allPlayers'].players.shift()!);

    const result = restoreHiddenTeams(edited, original, 2);

    expect(result['teamA'].players.map(p => p.id)).toEqual(['a1', 'p0']);
    expect(result['teamC'].players.map(p => p.id)).toEqual(['c1']);
    expect(result['teamD'].players.map(p => p.id)).toEqual(['d1', 'd2']);
    expect(result['allPlayers'].players).toEqual([]);
  });

  it('removes a hidden player from its team when dragged into a visible team', () => {
    const original = makeTeams();
    const edited = collapseExtraTeams(original, 2);
    const d1 = edited['allPlayers'].players.find(p => p.id === 'd1')!;
    edited['allPlayers'].players = edited['allPlayers'].players.filter(p => p.id !== 'd1');
    edited['teamB'].players.push(d1);

    const result = restoreHiddenTeams(edited, original, 2);

    expect(result['teamB'].players.map(p => p.id)).toEqual(['b1', 'd1']);
    expect(result['teamD'].players.map(p => p.id)).toEqual(['d2']);
    expect(result['allPlayers'].players.map(p => p.id)).toEqual(['p0']);
  });

  it('returns the edited map when nothing is hidden', () => {
    const edited = makeTeams();
    expect(restoreHiddenTeams(edited, makeTeams(), 4)).toBe(edited);
  });
});
