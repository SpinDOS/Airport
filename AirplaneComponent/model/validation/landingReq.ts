import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { isNotEmptyString } from "../../utils/validation";

export interface ILandingReq {
  stripId: string;
  aircraftId: Guid;
}

export function validateLandingReq(req: any): ILandingReq {
  if (!req) {
    throw new ValidationError("Empty landing request parameters");
  }

  if (!req.aircraftId || !Guid.isGuid(req.aircraftId)) {
    throw new ValidationError("Invalid landing request airplane id");
  }

  if (!isNotEmptyString(req.stripId)) {
    throw new ValidationError("Invalid strip id");
  }

  return {
    stripId: req.stripId,
    aircraftId: Guid.parse(req.aircraftId),
  };
}