export interface Player {
  name: string;
  rating: number;
  statistics: {
    [key: string]: { // `key` is used to represent date strings (e.g., 'dd-mm-yyyy')
      goals: number;
      wins: number;
      loses: number;
      draws: number;
      games: number;
    };
  };
}


export interface GoalModalEvent {
  team: string;
  player: Player
}
