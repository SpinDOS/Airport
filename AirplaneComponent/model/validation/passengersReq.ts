import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { isNotEmptyString, isPositiveInt } from "../../utils/utils";

export interface IUnloadPassengersReq {
  airplaneId: Guid;
  busId: string;
  count: number;
}

export function validateUnloadPasReq(unloadReq: any): IUnloadPassengersReq {
  if (!unloadReq) {
    throw new ValidationError("Missing passengers unload parameters");
  }

  let airplaneId: any = unloadReq.airplaneId;
  if (!airplaneId || !Guid.isGuid(airplaneId)) {
    throw new ValidationError("Invalid airplane id to unload passengers: " + airplaneId);
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
    airplaneId: Guid.parse(airplaneId),
    count: count,
    busId: busId,
   };
}

export interface ILoadPassengersReq {
  airplaneId: Guid;
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

  let airplaneId: any = passengersLoadReq.airplaneId;
  if (!airplaneId || !Guid.isGuid(airplaneId)) {
    throw new ValidationError("Invalid airplane id to unload passengers: " + airplaneId);
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
    airplaneId: Guid.parse(airplaneId),
    busId: passengersLoadReq.busId,
    passengers: passengers.map(validatePassengerId),
  };
}