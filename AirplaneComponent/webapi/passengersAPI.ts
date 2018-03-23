import * as rp from "request-promise";
import { onApiError } from "../errors/connectionError";

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