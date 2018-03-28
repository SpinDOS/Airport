import { Guid } from "guid-typescript";
import * as helper from "./helper";

export interface IUnloadPassengersReq {
  airplaneId: Guid;
  busId: string;
  count: number;
}

export function validateUnloadPasReq(unloadReq: any): IUnloadPassengersReq {
  unloadReq = helper.validateNotEmpty(unloadReq, "Missing passengers unload parameters");

  return {
    airplaneId: helper.validateGuid(unloadReq.airplaneId, "Invalid airplane id to unload passengers"),
    busId:      helper.validateNotEmptyString(unloadReq.busId, "Invalid bus id of unloading passengers bus"),
    count:      helper.validatePositiveInt(unloadReq.count, "Invalid passengers unload request's count"),
   };
}

export interface ILoadPassengersReq {
  airplaneId: Guid;
  busId: string;
  passengers: Guid[];
}

function validatePassengerId(passengerId: any): Guid {
  return helper.validateGuid(passengerId, "Invalid passenger id");
}

export function validateLoadPassengerReq(passengersLoadReq: any): ILoadPassengersReq {
  passengersLoadReq = helper.validateNotEmpty(passengersLoadReq, "Passengers load info not found");

  return {
    airplaneId: helper.validateGuid(passengersLoadReq.airplaneId, "Invalid airplane id to load passengers"),
    busId:      helper.validateNotEmptyString(passengersLoadReq.busId, "Invalid passengers loading bus id"),
    passengers: helper.validateNotEmptyArray(passengersLoadReq.passengers, validatePassengerId,
                      "Passengers list to load not found", "Passengers list to load is empty"),
  };
}