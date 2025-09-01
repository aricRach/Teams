export interface Player {
  id: string,
  team: 'teamA' | 'teamB' | 'teamC' | 'teamD';
  name: string;
  rating: number;
  isActive?: boolean;
  email?: string;
  statistics: {
    [key: string]: Statistics
  };
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
  TeamA = 'teamA',
  TeamB = 'teamB',
  TeamC = 'teamC',
  TeamD = 'teamD',
}
