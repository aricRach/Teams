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
