import { ValidationError } from "../../errors/validationError";
import { Guid } from "guid-typescript";
import { isNotEmptyString, isPositiveInt } from "../../utils/utils";

export interface IFLightReq {
  id: Guid;
  code: string;
  passengersCount: number;
  serviceBaggageCount: number;
}

export function validateFlightReq(flight: any): IFLightReq {
  if (!flight) {
    throw new ValidationError("Flight info not found");
  }

  let flightId: any = flight.id;
  if (!flightId || !Guid.isGuid(flightId)) {
    throw new ValidationError("Invalid flight id: " + flightId);
  }

  let code: any = flight.code;
  if (!isNotEmptyString(code)) {
    throw new ValidationError("Invalid flight code: " + code);
  }

  let passengersCount: any = flight.passengersCount;
  if (!isPositiveInt(passengersCount) && passengersCount !== 0) {
    throw new ValidationError("Invalid passengers count: " + passengersCount);
  }

  let serviceBaggageCount: any = flight.serviceBaggageCount;
  if (!isPositiveInt(serviceBaggageCount) && serviceBaggageCount !== 0) {
    throw new ValidationError("Invalid service baggage count: " + serviceBaggageCount);
  }

  return {
    id: Guid.parse(flightId),
    code: code,
    passengersCount: passengersCount,
    serviceBaggageCount: serviceBaggageCount,
  };
}

export interface IAirplaneCreateReq {
  landingFlight: IFLightReq;
  departureFlight: IFLightReq;
}

export function validateAirplaneCreateReq(airplaneCreateParams: IAirplaneCreateReq): IAirplaneCreateReq {
  if (!airplaneCreateParams) {
    throw new ValidationError("Airplane create configuration not found");
  }

  return {
    landingFlight: validateFlightReq(airplaneCreateParams.landingFlight),
    departureFlight: validateFlightReq(airplaneCreateParams.departureFlight),
  };
}