import { LogicalError } from "../errors/logicalError";

export function True(test: boolean, errorMessage?: string): void {
  if (!test) {
    throw new LogicalError(errorMessage || "Assertion error");
  }
}

export function AreEqual<T>(expected: T, actual: T): void {
  if (expected !== actual) {
    throw new LogicalError(`Expected '${expected}', but was '${actual}'`);
  }
}