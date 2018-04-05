import { Guid } from "guid-typescript";
import * as helper from "./helper";

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

  let validateParkingFunc: (arg: any) => string = function(arg: any): string {
    return helper.validateNotEmptyString(arg, "Invalid parking id in info query");
  };

  return {
    id:                 validateOptionalGuid(query.id, "airplane"),
    landingFlightId:    validateOptionalGuid(query.landingFlightId, "landing flight"),
    departureFlightId:  validateOptionalGuid(query.departureFlightId, "departure flight"),
    parkingId:          helper.validateOptional(query.parkingId, validateParkingFunc),
  };
}

function validateOptionalGuid(guid: any, type: string): Guid | undefined {
  let validateFunc: (arg: any) => Guid = function(arg: any): Guid {
    return helper.validateGuid(arg, `Invalid ${type} id in info request`);
  };

  return helper.validateOptional(guid, validateFunc);
}