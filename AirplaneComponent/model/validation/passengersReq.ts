import { IPassenger } from "../passenger";
import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { isNotEmptyString, isPositiveInt } from "../../utils/validation";

export interface IUnloadPassengersReq {
  landingFlightId: Guid;
  busId: string;
  count: number;
}

export function validateUnloadPasReq(request: any): IUnloadPassengersReq {
  if (!request) {
    throw new ValidationError("Missing passengers unload parameters");
  }

  let id: any = request.landingFlightId;
  if (!id || !Guid.isGuid(id)) {
    throw new ValidationError(`Not found landing flight(${id}) to unload passengers`);
  }

  if (!isPositiveInt(request.count)) {
    throw new ValidationError("Invalid passengers unload request's count");
  }

  if (!isNotEmptyString(request.busId)) {
    throw new ValidationError("Invalid bus id of unloading passengers bus");
  }

  return {
    landingFlightId: Guid.parse(id),
    count: request.count,
    busId: request.busId,
   };
}

export interface ILoadPassengersReq {
  departureFlightId: Guid;
  busId: string;
  passengers: Guid[];
}

export function validatePassengerId(passenger: any): Guid {
  if (!passenger || !Guid.isGuid(passenger)) {
    throw new ValidationError("Invalid passenger id");
  }

  return Guid.parse(passenger);
}

export function validateLoadPassengerReq(passengerLoadReq: any): ILoadPassengersReq {
  if (!passengerLoadReq) {
    throw new ValidationError("Passengers load info not found");
  }

  let departureFlightId: any = passengerLoadReq.departureFlightId;
  if (!departureFlightId || !Guid.isGuid(departureFlightId)) {
    throw new ValidationError("Invalid flight id: " + passengerLoadReq.departureFlightId);
  }

  if (!isNotEmptyString(passengerLoadReq.busId)) {
    throw new ValidationError("Passengers loading bus id not found");
  }

  if (!(passengerLoadReq.passengers instanceof Array)) {
    throw new ValidationError("Passengers list not found");
  }

  return {
    departureFlightId: Guid.parse(departureFlightId),
    busId: passengerLoadReq.busId,
    passengers: (passengerLoadReq.passengers as Array<any>).map(validatePassengerId),
  };
}