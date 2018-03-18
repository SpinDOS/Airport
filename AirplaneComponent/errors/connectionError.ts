export class ConnectionError extends Error {
  constructor(public url?: string, message?: string) {
    super(message || (url && "Can not connect to " + url) || undefined);
  }
}