// base error for application exceptions
export class BaseError extends Error {
  constructor(message?: string) {
    super(message);
  }

  toString(): string {
    return (`${this.name}: ${this.message}`) || super.toString();
  }
}