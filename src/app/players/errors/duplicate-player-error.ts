export class DuplicatePlayerError extends Error {
  constructor(name: string) {
    super(`Player with name "${name}" already exists as active or inactive players`);
    this.name = 'DuplicatePlayerError';
  }
}
