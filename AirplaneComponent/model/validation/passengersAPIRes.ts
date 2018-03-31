import { Guid } from "guid-typescript";
import { validateBaggageId } from "./baggageReq";
import * as helper from "./helper";

export interface IResponsePassenger {
  id: Guid;
  first_name: string;
  luggage: "None" | Guid;
}

//#region generate_flight

export interface IPassBagCreateRes {
  passengers: IResponsePassenger[];
  service_luggage: Guid[];
}

export function validatePasBagCreateResponse(response: any): IPassBagCreateRes {
  response = helper.validateNotEmpty(response, "Empty response of creation passengers and baggage");

  return {
    passengers:      helper.validateArray(response.passengers, validatePassenger,
                            "Passengers not found in response of creation passengers and baggage"),
    service_luggage: helper.validateArray(response.service_luggage, validateBaggageId,
                           "Baggage not found in response of creation passengers and baggage"),
  };
}

export function validatePassenger(passenger: any): IResponsePassenger {
  passenger = helper.validateNotEmpty(passenger, "Empty passenger found");

  let luggage: "None" | Guid = passenger.luggage === "None"
    ? passenger.luggage : validateBaggageId(passenger.luggage);

  return {
    id:         helper.validateGuid(passenger.id, "Invalid passenger id"),
    first_name: helper.validateNotEmptyString(passenger.first_name, "Invalid passenger name"),
    luggage:    luggage
  };
}

//#endregion

export function validateChangeStatusRes(changeStatusRes: any): { changed: number } {
  changeStatusRes = helper.validateNotEmpty(changeStatusRes, "Not found Passengers API change status response");

  return {
    changed: helper.validateNotNegativeInt(changeStatusRes.changed, "Invalid Passengers API change status 'changed' count"),
  };
}