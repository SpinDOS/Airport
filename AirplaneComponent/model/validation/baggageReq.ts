import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { isNotEmptyString, isPositiveInt } from "../../utils/utils";

export interface IUnloadBaggageReq {
  landingFlightId: Guid;
  carId: string;
  count: number;
}

export function validateUnloadBaggageReq(unloadBagReq: any): IUnloadBaggageReq {
  if (!unloadBagReq) {
    throw new ValidationError("Missing baggage unload parameters");
  }

  let landingFlightId: any = unloadBagReq.landingFlightId;
  if (!landingFlightId || !Guid.isGuid(landingFlightId)) {
    throw new ValidationError("Invalid landing flight to unload baggage: " + landingFlightId);
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
    landingFlightId: Guid.parse(landingFlightId),
    count: count,
    carId: carId,
   };
}



export interface ILoadBaggageReq {
  departureFlightId: Guid;
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

  let departureFlightId: any = baggageLoadReq.departureFlightId;
  if (!departureFlightId || !Guid.isGuid(departureFlightId)) {
    throw new ValidationError("Invalid departure flight to load baggage: " + departureFlightId);
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
    departureFlightId: Guid.parse(departureFlightId),
    carId: carId,
    baggages: baggages.map(validateBaggageId),
  };
}