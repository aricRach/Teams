export type MatchStatus = 'live' | 'completed' | 'abandoned' | 'correction' | 'voided';

export type MatchEventType =
  | 'match_started'
  | 'match_ended'
  | 'team_result'
  | 'player_goal'
  | 'player_assist'
  | 'stat_correction'
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
  // League mode - all optional, absent means a classic single match.
  mode?: 'single' | 'league';
  sessionId?: string;
  slot?: number;
  round?: number;
  teamKeys?: string[];
  /** Copy of the group's teamAliases map at the moment this match was created,
   *  so historical views render the name a team had when it was played. */
  teamAliasSnapshot?: Record<string, string>;
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
