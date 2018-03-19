import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { IPassenger } from "../passenger";
import { IBaggage } from "../baggage";
import { validateBaggageId } from "./baggageReq";
import { isNotEmptyString } from "../../utils/validation";

export interface IResponsePassenger {
  id: Guid;
  first_name: string;
  luggage: "None" | Guid;
}

export interface IPassBagCreateRes {
  passengers: IResponsePassenger[];
  service_luggage: Guid[];
}

export function validatePasBagCreateResponse(response: any): IPassBagCreateRes {
  if (!response) {
    throw new ValidationError("Empty response of creation passengers and baggage");
  }

  if (!(response.passengers instanceof Array)) {
    throw new ValidationError("Passengers not found in response of creation passengers and baggage");
  }

  if (!(response.service_luggage instanceof Array)) {
    throw new ValidationError("Baggage not found in response of creation passengers and baggage");
  }

  return {
    passengers: (response.passengers as Array<any>).map(validatePassenger),
    service_luggage: (response.service_luggage as Array<any>).map(validateBaggageId),
  };
}

export function validatePassenger(passenger: any): IResponsePassenger {
  if (!passenger) {
    throw new ValidationError("Empty passenger found");
  }

  if (!passenger.id || !Guid.isGuid(passenger.id)) {
    throw new ValidationError("Invalid passenger id: " + passenger.id);
  }

  if (!isNotEmptyString(passenger.first_name)) {
    throw new ValidationError("Invalid passenger name: " + passenger.first_name);
  }

  let luggage: "None" | Guid = passenger.luggage === "None"
    ? "None" : validateBaggageId(passenger.luggage);

  return {
    id: Guid.parse(passenger.id),
    first_name: passenger.first_name,
    luggage: luggage
  };
}