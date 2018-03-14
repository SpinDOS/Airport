export class LogicalError extends Error {
  constructor(message?: string) {
    super(message);
  }

  toString(): string {
    return this.message || super.toString();
  }
}