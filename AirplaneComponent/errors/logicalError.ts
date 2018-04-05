import { BaseError } from "./baseError";

export class LogicalError extends BaseError {
  constructor(message?: string) {
    super(message);
  }
}