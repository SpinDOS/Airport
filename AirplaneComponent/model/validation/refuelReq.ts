//#region import

import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { isPositiveNumber } from "../../utils/utils";
import * as helper from "./helper";

//#endregion

export interface IRefuelReq {
  aircraftId: Guid;
  carId: string;
  volume: number;
}

export function validateRefuelReq(refuelReq: any): IRefuelReq {
  refuelReq = helper.validateNotEmpty(refuelReq, "Expected refuelling parameters");

  return {
    aircraftId: helper.validateGuid(refuelReq.aircraftId, "Invalid airplane id for refuelling"),
    carId:      helper.validateNotEmptyString(refuelReq.carId, "Invalid car id for refuelling"),
    volume:     validateVolume(refuelReq.volume),
  };
}

function validateVolume(volume: any): number {
  if (!isPositiveNumber(volume)) {
    throw new ValidationError("Invalid refuelling volume: " + volume);
  }

  return volume;
}