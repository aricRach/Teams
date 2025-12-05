export class NotDividableError extends Error {
  constructor() {
    super(`The number of players must divide evenly into teams.`);
    this.name = 'NotDividableError';
  }
}
