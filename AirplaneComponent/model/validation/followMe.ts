import { ValidationError } from "../../errors/validationError";
import { isNotEmptyString } from "../../utils/utils";

export function validateFMStart(followMeStart: any): { carId: string } {
  let carId: any = followMeStart && followMeStart.carId;
  if (!isNotEmptyString(carId)) {
    throw new ValidationError("Invalid id of Follow-Me car: " + carId);
  }

  return { carId: carId };
}

export function validateFMEndToParking(followMeEnd: any): { parkingId: string } {
  let parkingId: any = followMeEnd && followMeEnd.parkingId;
  if (!isNotEmptyString(parkingId)) {
    throw new ValidationError("Invalid parking id after end of work of Follow-Me car: " + parkingId);
  }

  return { parkingId: parkingId };
}

export function validateFMEndToStrip(followMeEnd: any): { stripId: string } {
  let stripId: any = followMeEnd && followMeEnd.stripId;

  if (!isNotEmptyString(stripId)) {
    throw new ValidationError("Invalid strip id after end of work of Follow-Me car: " + stripId);
  }

  return { stripId: stripId };
}