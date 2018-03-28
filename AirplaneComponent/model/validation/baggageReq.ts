import { Guid } from "guid-typescript";
import * as helper from "./helper";

export interface IUnloadBaggageReq {
  airplaneId: Guid;
  carId: string;
  count: number;
}

export function validateUnloadBaggageReq(unloadBagReq: any): IUnloadBaggageReq {
  unloadBagReq = helper.validateNotEmpty(unloadBagReq, "Missing baggage unload parameters");

  return {
    airplaneId: helper.validateGuid(unloadBagReq.airplaneId, "Invalid airplane id to unload baggage"),
    carId:      helper.validateNotEmptyString(unloadBagReq.carId, "Invalid car id of unloading baggage car"),
    count:      helper.validatePositiveInt(unloadBagReq.count, "Invalid baggage unload request's baggage count"),
   };
}



export interface ILoadBaggageReq {
  airplaneId: Guid;
  carId: string;
  baggages: Guid[];
}

export function validateBaggageId(baggageId: any): Guid {
  return helper.validateGuid(baggageId, "Invalid baggage id");
}

export function validateLoadBaggageReq(baggageLoadReq: any): ILoadBaggageReq {
  baggageLoadReq = helper.validateNotEmpty(baggageLoadReq, "Baggage load parameters not found");

  return {
    airplaneId: helper.validateGuid(baggageLoadReq.airplaneId, "Invalid airplane id to load baggage"),
    carId:      helper.validateNotEmptyString(baggageLoadReq.carId, "Invalid baggage loading car id"),
    baggages:   helper.validateNotEmptyArray(baggageLoadReq.baggages, validateBaggageId,
                      "Baggage list to load not found", "Baggage list to load is empty"),
  };
}