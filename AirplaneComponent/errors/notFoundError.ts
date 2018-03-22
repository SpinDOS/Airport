import { BaseError } from "./baseError";

export class NotFoundError extends BaseError {
  constructor(public element?: string, message?: string) {
    super(message || getMessage(element));
  }
}

function getMessage(element?: string): string | undefined {
  return element
    ? "Not found: " + element
    : undefined;
}