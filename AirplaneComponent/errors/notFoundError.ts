export class NotFoundError extends Error {
  constructor(public element?: string, message?: string) {
    super(message);
  }

  toString(): string {
    if (this.message) {
      return this.message;
    } else if (this.element) {
      return `Not found: ${this.element}`;
    } else {
      return super.toString();
    }
  }
}