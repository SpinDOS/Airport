import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { isPositiveNumber, isNotEmptyString } from "../../utils/utils";

export interface IRefuelReq {
  aircraftId: Guid;
  carId: string;
  volume: number;
}

export function validateRefuelReq(refuelReq: any): IRefuelReq {
  if (!refuelReq) {
    throw new ValidationError("Expected refuelling parameters");
  }

  let aircraftId: any = refuelReq.aircraftId;
  if (!aircraftId || !Guid.isGuid(aircraftId)) {
    throw new ValidationError("Invalid airplane id for refuelling: " + aircraftId);
  }

  let carId: any = refuelReq.carId;
  if (!isNotEmptyString(carId)) {
    throw new ValidationError("Invalid car id for refuelling: " + carId);
  }

  let volume: any = refuelReq.volume;
  if (!isPositiveNumber(volume)) {
    throw new ValidationError("Invalid refuelling volume: " + volume);
  }

  return {
    aircraftId: Guid.parse(aircraftId),
    carId: carId,
    volume: volume,
  };
}