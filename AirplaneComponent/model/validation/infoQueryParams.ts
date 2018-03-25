import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { isNotEmptyString } from "../../utils/utils";

export interface IInfoQueryParams {
  id?: Guid;
  landingFlightId?: Guid;
  departureFlightId?: Guid;
  parkingId?: string;
}

export function validateInfoQueryParams(query: any): IInfoQueryParams {
  if (!query) {
    return { };
  }

  let parkingId: any = query.parkingId;
  if (parkingId && !isNotEmptyString(parkingId)) {
    throw new ValidationError("Invalid parking id in info query: " + parkingId);
  }

  return {
    id: validateOptionalGuid(query.id, "airplane"),
    landingFlightId: validateOptionalGuid(query.landingFlightId, "landing flight"),
    departureFlightId: validateOptionalGuid(query.departureFlightId, "departure flight"),
    parkingId: parkingId,
  };
}

function validateOptionalGuid(guid: any, type: string): Guid | undefined {
  if (!guid) {
    return undefined;
  }

  if (!Guid.isGuid(guid)) {
    throw new ValidationError(`Invalid ${type} id in info request: ` + guid);
  }

  return Guid.parse(guid);
}