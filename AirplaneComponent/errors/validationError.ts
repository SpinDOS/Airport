import { ValidationError as ClassValidatorError } from "class-validator";

export class ValidationError extends Error {
  sourceText?: string;
  errors?: ClassValidatorError[];

  constructor(params: {
    message?: string;
    sourceText?: string;
    errors?: ClassValidatorError[];
  }) {
    super(params.message);
    this.sourceText = params.sourceText;
    this.errors = params.errors;
  }

  toString(): string {
    if (this.message) {
      return this.message;
    }

    if (this.errors) {
      let result: string = `Validation errors(${this.errors.length} items): `;
      for (let error of this.errors) {
        result += `\r\nInvalid '${error.property}' on '${error.target}': '${error.value}'`;
      }
      return result;
    }

    if (this.sourceText) {
      return `Validation errors detected: ${this.sourceText}`;
    }

    return super.toString();
  }
}