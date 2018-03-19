export class ConnectionError extends Error {
  constructor(public url?: string, message?: string) {
    super(message || (url && "Can not connect to " + url) || undefined);
  }
}

export function onApiError(err: any): never {
  if (err.statusCode) {
    throw new ConnectionError("Passenger API error: status " + err.statusCode);
  } else {
    throw new ConnectionError("Passenger API error");
  }
}