import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";

export function validateFlyReq(fly: any): { airplaneId: Guid } {
  let airplaneId: any = fly && fly.airplaneId;
  if (!airplaneId || !Guid.isGuid(airplaneId)) {
    throw new ValidationError("Invalid airplane id for fly: " + airplaneId);
  }

  return { airplaneId: Guid.parse(airplaneId) };
}