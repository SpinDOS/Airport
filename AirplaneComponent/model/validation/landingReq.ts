import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { isNotEmptyString } from "../../utils/utils";

export interface ILandingReq {
  stripId: string;
  aircraftId: Guid;
}

export function validateLandingReq(landingReq: any): ILandingReq {
  if (!landingReq) {
    throw new ValidationError("Empty landing request parameters");
  }

  let aircraftId: any = landingReq.aircraftId;
  if (!aircraftId || !Guid.isGuid(aircraftId)) {
    throw new ValidationError("Invalid landing request airplane id: " + aircraftId);
  }

  let stripId: any = landingReq.stripId;
  if (!isNotEmptyString(stripId)) {
    throw new ValidationError("Invalid landing request strip id: " + stripId);
  }

  return {
    stripId: stripId,
    aircraftId: Guid.parse(aircraftId),
  };
}