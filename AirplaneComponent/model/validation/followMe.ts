import { ValidationError } from "../../errors/validationError";
import { isNotEmptyString } from "../../utils/validation";

export function validateFollowMeStart(followMeStart: any): { carId: string } {
  if (!followMeStart || !isNotEmptyString(followMeStart.carId)) {
    throw new ValidationError("Expected id of Follow-Me car");
  }

  return { carId: followMeStart.carId };
}

export function validateFollowMeEndToParking(followMeEnd: any): { parkingId: string } {
  if (!followMeEnd || !isNotEmptyString(followMeEnd.parkingId)) {
    throw new ValidationError("Expected id of parking after end of work of Follow-Me car");
  }

  return { parkingId: followMeEnd.parkingId };
}

export function validateFollowMeEndToStrip(followMeEnd: any): { stripId: string } {
  if (!followMeEnd || !isNotEmptyString(followMeEnd.stripId)) {
    throw new ValidationError("Expected id of strip after end of work of Follow-Me car");
  }

  return { stripId: followMeEnd.stripId };
}