import { ClassType } from "class-transformer/ClassTransformer";
import { transformAndValidateSync } from "class-transformer-validator";
import { ValidationError } from "class-validator";

export function transformAndValidate<T extends object>(classType: ClassType<T>, val: any): T | T[] {
  try {
    return transformAndValidateSync(classType, val);
  }
  catch(e) {
    let err = e[0] as ValidationError;
    throw new Error(`Invalid ${err.property} on ${err.target.constructor.name}: ${err.value}`);
  }
}

export function transformAndValidateSingle<T extends object>(classType: ClassType<T>, val: any): T {
  let result = transformAndValidate(classType, val);
  if (Array.isArray(result)) {
    throw new Error(`Expected single ${classType.name} but got array`);
  }

  return result as T;
}

export function transformAndValidateArray<T extends object>(classType: ClassType<T>, val: any): T[] {
  let result = transformAndValidate(classType, val);
  if (!Array.isArray(result)) {
    throw new Error(`Expected array of ${classType.name} but got single value`);
  }

  return result as T[];
}