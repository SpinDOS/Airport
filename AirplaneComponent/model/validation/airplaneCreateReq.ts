import { Guid } from "guid-typescript";
import * as helper from "./helper";

export interface IFLightReq {
  id: Guid;
  code: string;
  passengersCount: number;
  serviceBaggageCount: number;
}

export function validateFlightReq(flight: any): IFLightReq {
  flight = helper.validateNotEmpty(flight, "Flight info not found");

  return {
    id:                  helper.validateGuid(flight.id, "Invalid flight id"),
    code:                helper.validateNotEmptyString(flight.code, "Invalid flight code"),
    passengersCount:     helper.validateNotNegativeInt(flight.passengersCount, "Invalid passengers count"),
    serviceBaggageCount: helper.validateNotNegativeInt(flight.serviceBaggageCount, "Invalid service baggage count"),
  };
}

export interface IAirplaneCreateReq {
  landingFlight: IFLightReq;
  departureFlight: IFLightReq;
}

export function validateAirplaneCreateReq(airplaneCreateParams: IAirplaneCreateReq): IAirplaneCreateReq {
  airplaneCreateParams = helper.validateNotEmpty(airplaneCreateParams, "Airplane create configuration not found");

  return {
    landingFlight:   validateFlightReq(airplaneCreateParams.landingFlight),
    departureFlight: validateFlightReq(airplaneCreateParams.departureFlight),
  };
}