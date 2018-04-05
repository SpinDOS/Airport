import { BaseError } from "./baseError";

export class ConnectionError extends BaseError {
  constructor(public url?: string, message?: string) {
    super(message || getMessage(url));
  }
}

function getMessage(url?: string): string | undefined {
  return url
    ? "Can not connect to " + url
    : undefined;
}

export function onApiError(api: string, err: any, url?: string): never {
  let message: string = api + " connection error";
  if (err.statusCode) {
    message += ": status code " + err.statusCode;
  }

  throw new ConnectionError(url, message);
}
