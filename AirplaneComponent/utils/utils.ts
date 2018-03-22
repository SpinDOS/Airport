import { ValidationError } from "../errors/validationError";

export function isString(s: any): boolean {
  return typeof s === "string";
}

export function isNotEmptyString(s: any): boolean {
  return s && isString(s);
}

export function isNumber(x: any): boolean {
  return typeof x === "number";
}

export function isPositiveNumber(x: any): boolean {
  return isNumber(x) && x > 0;
}

export function isPositiveInt(n: any): boolean {
  return isPositiveNumber(n) && Number.isInteger(n);
}

export function strToPOCO(data: any): object {
  if (typeof data === "object") {
    return data;
  }

  if (!isNotEmptyString(data)) {
    throw new ValidationError("JSON not found");
  }

  try {
    return JSON.parse(data);
  } catch {
    throw new ValidationError(`JSON expected. Got ${data}`);
  }
}