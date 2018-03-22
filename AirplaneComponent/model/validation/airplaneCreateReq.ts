import { IFlight } from "../flight";
import { ValidationError } from "../../errors/validationError";
import { Guid } from "guid-typescript";
import { isNotEmptyString } from "../../utils/validation";

export interface IFLightReq {
  id: Guid;
  code: string;
  passengersCount: number;
  serviceBaggageCount: number;
}

export function validateFlightReq(flight: any): IFLightReq {
  if (!flight) {
    throw new ValidationError("Flight not found");
  }

  if (!flight.id || !Guid.isGuid(flight.id)) {
    throw new ValidationError("Flight id not found");
  }

  if (!isNotEmptyString(flight.code)) {
    throw new ValidationError("Flight code not found");
  }

  if (!Number.isInteger(flight.passengersCount) || flight.passengersCount < 0) {
    throw new ValidationError("Invalid passengers count");
  }

  if (!Number.isInteger(flight.serviceBaggageCount) || flight.serviceBaggageCount < 0) {
    throw new ValidationError("Invalid service baggage count");
  }

  return {
    id: Guid.parse(flight.id),
    code: flight.code,
    passengersCount: flight.passengersCount,
    serviceBaggageCount: flight.serviceBaggageCount,
  };
}

export interface IAirplaneCreateReq {
  landingFlight: IFLightReq;
  departureFlight: IFLightReq;
}

export function validateAirplaneCreateReq(airplaneCreateParams: IAirplaneCreateReq): IAirplaneCreateReq {
  if (!airplaneCreateParams) {
    throw new ValidationError("Airplane create parameters not found");
  }

  return {
    landingFlight: validateFlightReq(airplaneCreateParams.landingFlight),
    departureFlight: validateFlightReq(airplaneCreateParams.departureFlight),
  };
}