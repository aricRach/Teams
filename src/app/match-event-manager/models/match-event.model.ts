export type MatchStatus = 'live' | 'completed' | 'abandoned';

export type MatchEventType =
  | 'match_started'
  | 'match_ended'
  | 'team_result'
  | 'player_goal'
  | 'player_assist'
  | 'custom';

export interface MatchRecord {
  id?: string;
  status: MatchStatus;
  winner?: string;
  loser?: string;
  winnerPlayerIds?: string[];
  loserPlayerIds?: string[];
  wonTeamScore?: number;
  loseTeamScore?: number;
  gameStatus?: 'draw' | 'decided';
  startedAt?: any;
  endedAt?: any;
  createdAt?: any;
  updatedAt?: any;
  createdBy: string;
}

export interface MatchEventRecord {
  id?: string;
  type: MatchEventType;
  minute?: number | null;
  teamKey?: string;
  playerId?: string;
  playerNameSnapshot?: string;
  payload?: Record<string, any>;
  createdAt?: any;
  updatedAt?: any;
  deletedAt?: any;
  source: 'manual' | 'voice';
  createdBy: string;
}
