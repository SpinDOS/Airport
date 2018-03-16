import { LogicalError } from "../errors/logicalError";

export function True(test: boolean, errorMessage?: string): void {
  if (!test) {
    throw new LogicalError(errorMessage);
  }
}

export function AreEqual(expected: any, actual: any): void {
  if (expected !== actual) {
    throw new LogicalError(`Expected '${expected}', but was '${actual}'`);
  }
}