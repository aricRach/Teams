export const PLAYER_NAME_MAX_LENGTH = 16;

export interface Player {
  id: string,
  team: TeamsOptions;
  name: string;
  rating: number;
  isActive?: boolean;
  email?: string;
  statistics: {
    [key: string]: Statistics
  };
  isGuest: boolean;
}

export interface Statistics {
  goals: number;
  wins: number;
  loses: number;
  draws: number;
  games: number;
  goalsConceded: number;
  /** Matches with a saved score: goalsConceded is counted over these, so conceded/game divides by this. */
  scoredGames: number;
  ownGoals: number;
  /** Matches the player's team finished with 0 goals conceded. */
  cleanSheets: number;
}


export interface GoalModalEvent {
  team: string;
  player: Player
}

export enum TeamsOptions {
  AllPlayers = 'allPlayers',
  TeamA = 'teamA',
  TeamB = 'teamB',
  TeamC = 'teamC',
  TeamD = 'teamD',
}
