import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { isNotEmptyString, isPositiveInt } from "../../utils/utils";

export interface IUnloadBaggageReq {
  airplaneId: Guid;
  carId: string;
  count: number;
}

export function validateUnloadBaggageReq(unloadBagReq: any): IUnloadBaggageReq {
  if (!unloadBagReq) {
    throw new ValidationError("Missing baggage unload parameters");
  }

  let airplaneId: any = unloadBagReq.airplaneId;
  if (!airplaneId || !Guid.isGuid(airplaneId)) {
    throw new ValidationError("Invalid airplane id to unload baggage: " + airplaneId);
  }

  let count: any = unloadBagReq.count;
  if (!isPositiveInt(count)) {
    throw new ValidationError("Invalid baggage unload request's baggage count: " + unloadBagReq.count);
  }

  let carId: any = unloadBagReq.carId;
  if (!isNotEmptyString(carId)) {
    throw new ValidationError("Invalid car id of unloading baggage car: " + carId);
  }

  return {
    airplaneId: Guid.parse(airplaneId),
    count: count,
    carId: carId,
   };
}



export interface ILoadBaggageReq {
  airplaneId: Guid;
  carId: string;
  baggages: Guid[];
}

export function validateBaggageId(baggageId: any): Guid {
  if (!baggageId || !Guid.isGuid(baggageId)) {
    throw new ValidationError("Invalid baggage id: " + baggageId);
  } else {
    return Guid.parse(baggageId);
  }
}

export function validateLoadBaggageReq(baggageLoadReq: any): ILoadBaggageReq {
  if (!baggageLoadReq) {
    throw new ValidationError("Baggage load parameters not found");
  }

  let airplaneId: any = baggageLoadReq.airplaneId;
  if (!airplaneId || !Guid.isGuid(airplaneId)) {
    throw new ValidationError("Invalid airplane id to load baggage: " + airplaneId);
  }

  let carId: any = baggageLoadReq.carId;
  if (!isNotEmptyString(carId)) {
    throw new ValidationError("Invalid baggage loading car id: " + carId);
  }

  let baggages: Array<any> = baggageLoadReq.baggages;
  if (!(baggageLoadReq.baggages instanceof Array)) {
    throw new ValidationError("Baggage list to load not found");
  }

  if (baggages.length === 0) {
    throw new ValidationError("Baggage list to load is empty");
  }

  return {
    airplaneId: Guid.parse(airplaneId),
    carId: carId,
    baggages: baggages.map(validateBaggageId),
  };
}