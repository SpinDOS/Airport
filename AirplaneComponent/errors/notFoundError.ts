export class NotFoundError extends Error {
  constructor(private element?: string, message?: string) {
    super(message || `Not found: ${element}`);
  }

  toString(): string {
    return this.message;
  }
}