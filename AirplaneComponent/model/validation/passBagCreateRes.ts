import { Guid } from "guid-typescript";
import { ValidationError } from "../../errors/validationError";
import { validateBaggageId } from "./baggageReq";
import { isNotEmptyString } from "../../utils/utils";

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

  let passengers: Array<any> = response.passengers;
  if (!(passengers instanceof Array)) {
    throw new ValidationError("Passengers not found in response of creation passengers and baggage");
  }

  let service_luggage: Array<any> = response.service_luggage;
  if (!(service_luggage instanceof Array)) {
    throw new ValidationError("Baggage not found in response of creation passengers and baggage");
  }

  return {
    passengers: passengers.map(validatePassenger),
    service_luggage: service_luggage.map(validateBaggageId),
  };
}

export function validatePassenger(passenger: any): IResponsePassenger {
  if (!passenger) {
    throw new ValidationError("Empty passenger found");
  }

  let id: any = passenger.id;
  if (!id || !Guid.isGuid(id)) {
    throw new ValidationError("Invalid passenger id: " + id);
  }

  let first_name: any = passenger.first_name;
  if (!isNotEmptyString(first_name)) {
    throw new ValidationError("Invalid passenger name: " + first_name);
  }

  let luggage: "None" | Guid = passenger.luggage === "None"
    ? "None" : validateBaggageId(passenger.luggage);

  return {
    id: Guid.parse(id),
    first_name: first_name,
    luggage: luggage
  };
}