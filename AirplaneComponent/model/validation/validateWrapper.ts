import { ClassType } from "class-transformer/ClassTransformer";
import { transformAndValidateSync } from "class-transformer-validator";
import { ValidationError as ClassValidatorError } from "class-validator";
import { ValidationError } from "../../errors/validationError";

export type validateInput = string | object;
export type validateArrayInput = string | object[];
export type validateAnyInput = validateInput | validateArrayInput;

export function transformAndValidateAny<T extends object>(classType: ClassType<T>, val: validateAnyInput): T | T[] {
  if (!val) {
    throw new ValidationError({ message: "No data" });
  }

  try {
    return transformAndValidateSync(classType, val as string);
  } catch(e) {
    if (e instanceof Array && e[0] instanceof ClassValidatorError) {
      throw new ValidationError({ errors: e });
    } else {
      throw e;
    }
  }
}

export function transformAndValidateSingle<T extends object>(classType: ClassType<T>, val: validateInput): T {
  let result: T | T[] = transformAndValidateAny(classType, val);
  if (!Array.isArray(result)) {
    return result as T;
  }

  throw new ValidationError({ message: `Expected single ${classType.name} but got array` });
}

export function transformAndValidateArray<T extends object>(classType: ClassType<T>, val: validateArrayInput): T[] {
  let result: T | T[] = transformAndValidateAny(classType, val);
  if (Array.isArray(result)) {
    return result as T[];
  }
  throw new ValidationError({ message: `Expected array of ${classType.name} but got single value` });
}