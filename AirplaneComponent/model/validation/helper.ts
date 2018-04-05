import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { isNotEmptyString, isPositiveInt } from "../../utils/utils";

export function validateNotEmpty(obj: any, errorMessage: string): any {
  if (!obj) {
    throw new ValidationError(errorMessage);
  }

  return obj;
}

export function validateGuid(guid: any, errorMessage: string): Guid {
  if (!guid || !Guid.isGuid(guid.toString())) {
    throwError(guid, errorMessage);
  }

  return Guid.parse(guid.toString());
}

export function validateNotEmptyString(str: any, errorMessage: string): string {
  if (!isNotEmptyString(str)) {
    throwError(str, errorMessage);
  }

  return str;
}

export function validateNotNegativeInt(int: any, errorMessage: string): number {
  if (!isPositiveInt(int) && int !== 0) {
    throwError(int, errorMessage);
  }

  return int;
}

export function validatePositiveInt(int: any, errorMessage: string): number {
  if (!isPositiveInt(int)) {
    throwError(int, errorMessage);
  }

  return int;
}

export function validateArray<T>(arr: any, elemFunc: (elem: any) => T, errorMessage: string): T[] {
  if (!(arr instanceof Array)) {
    throwError (arr, errorMessage);
  }

  return (arr as Array<any>).map(elemFunc);
}

export function validateNotEmptyArray<T>(arr: any, elemFunc: (elem: any) => T,
  notFoundErrorMessage: string, emptyArrErrorMessage: string): T[] {

  let validArr: Array<T> = validateArray(arr, elemFunc, notFoundErrorMessage);
  if (validArr.length === 0) {
    throwError(arr, emptyArrErrorMessage);
  }

  return validArr;
}

export function validateOptional<T>(val: any, validateFunc: (elem: any) => T): T | undefined {
  if (!val) {
    return undefined;
  }

  return validateFunc(val);
}

function throwError(val: any, errorMessage: string): never {
  throw new ValidationError(`${errorMessage}: '${val}'`);
}