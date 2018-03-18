export class ValidationError extends Error {
  constructor(message?: string, public sourceText?: string) {
    super(message);
  }

  toString(): string {
    if (this.message) {
      return this.message;
    }

    if (this.sourceText) {
      return `Validation errors detected: ${this.sourceText}`;
    }

    return super.toString();
  }
}