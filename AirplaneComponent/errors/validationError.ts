import { BaseError } from "./baseError";

export class ValidationError extends BaseError {
  constructor(message?: string, public sourceText?: string) {
    super(message);
  }

  toString(): string {
    return !this.message && this.sourceText
      ? "Validation errors: " + this.sourceText
      : super.toString();
  }
}