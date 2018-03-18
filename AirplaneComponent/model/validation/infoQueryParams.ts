import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { isString } from "util";

export interface IQueryParams {
  id?: Guid;
  landingFlightId?: Guid;
  departureFlightId?: Guid;
  parkingId?: string;
}

export function validateInfoQueryParams(query: any): IQueryParams {
  if (!query) {
    return { };
  }

  if (query.parkingId && !isString(query.parkingId)) {
    throw new ValidationError("Invalid parking id in info query");
  }

  return {
    id: validateOptionalGuid(query.id, "airplane"),
    landingFlightId: validateOptionalGuid(query.landingFlightId, "landing flight"),
    departureFlightId: validateOptionalGuid(query.departureFlightId, "departure flight"),
    parkingId: query.parkingId,
  };
}

function validateOptionalGuid(guid: any, type: string): Guid | undefined {
  if (!guid) {
    return undefined;
  }

  if (!Guid.isGuid(guid)) {
    throw new ValidationError(`Invalid ${type} id in info request`);
  }

  return Guid.parse(guid);
}