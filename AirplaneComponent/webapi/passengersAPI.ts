export const passengersUrl: string = "http://quantum0.pythonanywhere.com/";

import { Guid } from "guid-typescript";
import * as rp from "request-promise";

import { strToPOCO } from "../utils/utils";
import { onApiError } from "../errors/connectionError";
import { ValidationError } from "../errors/validationError";

import { IPassenger } from "../model/passenger";
import { IBaggage } from "../model/baggage";
import { validateArray } from "../model/validation/helper";
import { IResponsePassenger, validatePassenger,
  IPassBagCreateRes, validatePasBagCreateResponse } from "../model/validation/passBagCreateRes";


const headers: any = {
  "content-type": "application/json",
};

export async function get(url: string, qs?: object): Promise<string> {
  return rp.get(passengersUrl + url, { qs: qs } )
    .catch(e => onApiError("Passenger API", e));
}

export async function post(url: string, body: object): Promise<string> {
  return rp.post(passengersUrl + url, {
    headers: headers,
    body: JSON.stringify(body)
  })
  .catch(e => onApiError("Passenger API", e));
}

export function parseArrayOfPassengers(data: string): IResponsePassenger[] {
    let poco: object = strToPOCO(data);
    return validateArray(poco, validatePassenger, "Passenger API response error: JSON array of passengers expected");
}

export function mapRespPasToPas(respPas: IResponsePassenger): IPassenger {
  return {
    id: respPas.id,
    name: respPas.first_name,
    baggageId: respPas.luggage !== "None"? respPas.luggage : undefined,
  };
}

export class PasAndBag {
  constructor(public readonly passengers: IPassenger[],
    public readonly baggage: IBaggage[]) { }
}

export function parseGenerateResponse(data: string): PasAndBag {
  let poco: object = strToPOCO(data);
  let response: IPassBagCreateRes = validatePasBagCreateResponse(poco);

  let passengers: IPassenger[] = response.passengers.map(mapRespPasToPas);

  let baggages: IBaggage[] =
    passengers.filter(p => !!p.baggageId).map(p => p.baggageId as Guid)
    .concat(response.service_luggage)
    .map(guid => {
      return { id: guid };
    });

  return new PasAndBag(passengers, baggages);
}
