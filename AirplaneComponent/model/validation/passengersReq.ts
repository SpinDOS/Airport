import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { isNotEmptyString, isPositiveInt } from "../../utils/utils";

export interface IUnloadPassengersReq {
  landingFlightId: Guid;
  busId: string;
  count: number;
}

export function validateUnloadPasReq(unloadReq: any): IUnloadPassengersReq {
  if (!unloadReq) {
    throw new ValidationError("Missing passengers unload parameters");
  }

  let landingFlightId: any = unloadReq.landingFlightId;
  if (!landingFlightId || !Guid.isGuid(landingFlightId)) {
    throw new ValidationError("Invalid landing flight id to unload passengers: " + landingFlightId);
  }

  let count: any = unloadReq.count;
  if (!isPositiveInt(count)) {
    throw new ValidationError("Invalid passengers unload request's count: " + count);
  }

  let busId: any = unloadReq.busId;
  if (!isNotEmptyString(busId)) {
    throw new ValidationError("Invalid bus id of unloading passengers bus: " + busId);
  }

  return {
    landingFlightId: Guid.parse(landingFlightId),
    count: count,
    busId: busId,
   };
}

export interface ILoadPassengersReq {
  departureFlightId: Guid;
  busId: string;
  passengers: Guid[];
}

export function validatePassengerId(passengerId: any): Guid {
  if (!passengerId || !Guid.isGuid(passengerId)) {
    throw new ValidationError("Invalid passenger id: " + passengerId);
  }

  return Guid.parse(passengerId);
}

export function validateLoadPassengerReq(passengersLoadReq: any): ILoadPassengersReq {
  if (!passengersLoadReq) {
    throw new ValidationError("Passengers load info not found");
  }

  let departureFlightId: any = passengersLoadReq.departureFlightId;
  if (!departureFlightId || !Guid.isGuid(departureFlightId)) {
    throw new ValidationError("Invalid departure flight id to unload passengers: " + departureFlightId);
  }

  let busId: any = passengersLoadReq.busId;
  if (!isNotEmptyString(busId)) {
    throw new ValidationError("Invalid passengers loading bus id: " + busId);
  }

  let passengers: Array<any> = passengersLoadReq.passengers;
  if (passengers.length === 0) {
    throw new ValidationError("Passengers list to load is empty");
  }

  return {
    departureFlightId: Guid.parse(departureFlightId),
    busId: passengersLoadReq.busId,
    passengers: passengers.map(validatePassengerId),
  };
}