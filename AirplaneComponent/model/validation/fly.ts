import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";

export function validateFly(fly: any): { airplaneId: Guid } {
  if (!fly || !fly.airplaneId || !Guid.isGuid(fly.airplaneId)) {
    throw new ValidationError("Airplane id for fly not found");
  }
  return { airplaneId: Guid.parse(fly.airplaneId) };
}