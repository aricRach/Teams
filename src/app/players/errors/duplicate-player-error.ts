export class DuplicatePlayerError extends Error {
  constructor(name: string) {
    super(`Player with name "${name}" already exists`);
    this.name = 'DuplicatePlayerError';
  }
}
