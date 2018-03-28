import { BaseError } from "./baseError";

export class ValidationError extends BaseError {
  constructor(message?: string, public sourceText?: string) {
    super(message);
  }

  toString(): string {
    let result: string = this.message || "Validation error";
    if (!this.sourceText) {
      return result;
    }

    return result + ": " + this.sourceText;
  }
}