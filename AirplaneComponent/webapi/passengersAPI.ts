import { Guid } from "guid-typescript";
import * as rp from "request-promise";

import { strToPOCO } from "../utils/utils";
import { onApiError } from "../errors/connectionError";
import { ValidationError } from "../errors/validationError";

import { IPassenger } from "../model/passenger";
import { IBaggage } from "../model/baggage";
import { IResponsePassenger, validatePassenger,
  IPassBagCreateRes, validatePasBagCreateResponse } from "../model/validation/passBagCreateRes";



export const passengersUrl: string = "http://quantum0.pythonanywhere.com/";

const headers: any = {
  "content-type": "application/json",
};

export async function get(url: string, qs?: object): Promise<any> {
  return rp.get(passengersUrl + url, { qs: qs } )
    .catch(e => onApiError("Passenger API", e));
}

export async function post(url: string, body: object): Promise<any> {
  return rp.post(passengersUrl + url, {
    headers: headers,
    body: JSON.stringify(body)
  })
  .catch(e => onApiError("Passenger API", e));
}

export function parseArrayOfPassengers(data: string): IResponsePassenger[] {
    let poco: object = strToPOCO(data);
    if (!(poco instanceof Array)) {
      throw new ValidationError("Passenger API response error: JSON array of passengers expected. Got: " + data);
    }
    return poco.map(validatePassenger);
}


export class PasAndBag {
  constructor(public readonly passengers: IPassenger[],
    public readonly baggage: IBaggage[]) { }
}

export function parseGenerateResponse(data: string): PasAndBag {
  let poco: object = strToPOCO(data);
  let response: IPassBagCreateRes = validatePasBagCreateResponse(poco);

  let passengers: IPassenger[] = response.passengers.map(p => {
    return {
      id: p.id,
      name: p.first_name,
      baggage: p.luggage !== "None"? p.luggage: undefined,
    };
  });

  let baggages: IBaggage[] =
    response.passengers.filter(p => p.luggage !== "None").map(p => p.luggage as Guid)
    .concat(response.service_luggage)
    .map(guid => {
      return { id: guid };
    });

  return new PasAndBag(passengers, baggages);
}
