import { Player } from '../../../players/models/player.model';
import { countHeadToHead } from './head-to-head.util';
import { MatchSummary } from '../../utils/match-summary.util';
import { plural } from '../../utils/stats-format.util';
import { ratio } from '../../utils/stats-math.util';
import { PLAYER_COLORS } from './selected-players.util';

function sharePercent(part: number, whole: number): number {
  return ratio(part, whole) * 100;
}

/** Bar widths and legend texts for the two players' head-to-head card. */
export function buildHeadToHeadView(firstPlayer: Player, secondPlayer: Player, matches: MatchSummary[]) {
  const { together, against } = countHeadToHead(matches, firstPlayer.id, secondPlayer.id);
  return {
    together: {
      label: `${plural(together.matches, 'match', 'matches')} · ${together.wins}-${together.draws}-${together.losses}`,
      wonText: `${together.wins} won`,
      drawnText: `${together.draws} drawn`,
      lostText: `${together.losses} lost`,
      wonPercent: sharePercent(together.wins, together.matches),
      drawnPercent: sharePercent(together.draws, together.matches),
      lostPercent: sharePercent(together.losses, together.matches),
    },
    against: {
      label: plural(against.matches, 'match', 'matches'),
      firstPlayerText: `${firstPlayer.name} ${against.firstPlayerWins}`,
      drawsText: plural(against.draws, 'draw'),
      secondPlayerText: `${secondPlayer.name} ${against.secondPlayerWins}`,
      firstPlayerPercent: sharePercent(against.firstPlayerWins, against.matches),
      drawsPercent: sharePercent(against.draws, against.matches),
      secondPlayerPercent: sharePercent(against.secondPlayerWins, against.matches),
      firstPlayerColor: PLAYER_COLORS[0],
      secondPlayerColor: PLAYER_COLORS[1],
    },
  };
}
