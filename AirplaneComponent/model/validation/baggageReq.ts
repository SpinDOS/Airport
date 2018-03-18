import { IBaggage } from "../baggage";
import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { isNotEmptyString, isPositiveInt } from "../../utils/validation";

export interface IUnloadBaggageReq {
  landingFlightId: Guid;
  carId: string;
  count: number;
}

export function validateUnloadBaggageReq(request: any): IUnloadBaggageReq {
  if (!request) {
    throw new ValidationError("Missing baggage unload parameters");
  }

  let id: any = request.landingFlightId;
  if (!id || !Guid.isGuid(id)) {
    throw new ValidationError(`Not found landing flight(${id}) to unload baggage`);
  }

  if (!isPositiveInt(request.count)) {
    throw new ValidationError("Invalid baggage unload request's baggage count");
  }

  if (!isNotEmptyString(request.carId)) {
    throw new ValidationError("Invalid car id of unloading baggage car");
  }

  return {
    landingFlightId: Guid.parse(id),
    count: request.count,
    carId: request.carId,
   };
}

export interface ILoadBaggageReq {
  departureFlightId: Guid;
  carId: string;
  baggages: Guid[];
}

export function validateBaggageId(baggage: any): Guid {
  if (!baggage || !Guid.isGuid(baggage)) {
    throw new ValidationError("Invalid baggage id");
  }

  return Guid.parse(baggage);
}

export function validateLoadBaggageReq(baggageLoadStart: any): ILoadBaggageReq {
  if (!baggageLoadStart) {
    throw new ValidationError("Baggage load info not found");
  }

  let departureFlightId: any = baggageLoadStart.departureFlightId;
  if (!departureFlightId || !Guid.isGuid(departureFlightId)) {
    throw new ValidationError("Invalid flight id: " + baggageLoadStart.departureFlightId);
  }

  if (!isNotEmptyString(baggageLoadStart.carId)) {
    throw new ValidationError("Baggage loading car id not found");
  }

  if (!(baggageLoadStart.baggage instanceof Array)) {
    throw new ValidationError("Baggage list not found");
  }

  return {
    departureFlightId: Guid.parse(departureFlightId),
    carId: baggageLoadStart.carId,
    baggages: (baggageLoadStart.baggages as Array<any>).map(validateBaggageId),
  };
}