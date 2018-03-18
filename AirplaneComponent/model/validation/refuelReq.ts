import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { isPositiveNumber } from "../../utils/validation";

export interface IRefuelReq {
  volume: number;
  aircraftId: Guid;
}

export function validateRefuelReq(req: any): IRefuelReq {
  if (!req) {
    throw new ValidationError("Expected refuelling parameters");
  }

  if (!req.aircraftId || !Guid.isGuid(req.aircraftId)) {
    throw new ValidationError("Invalid airplane id for refuelling");
  }

  if (!isPositiveNumber(req.volume)) {
    throw new ValidationError("Invalid refuelling volume");
  }

  return {
    volume: req.volume,
    aircraftId: Guid.parse(req.aircraftId),
  };
}