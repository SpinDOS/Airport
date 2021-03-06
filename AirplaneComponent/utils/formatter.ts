//#region import

import { Guid } from "guid-typescript";

import { IFlight } from "../model/Flight";
import { IAirplane } from "../model/airplane";
import { IAirplaneModel } from "../model/airplaneModel";
import { IBaggage } from "../model/baggage";
import { IPassenger } from "../model/passenger";

import { ValidationError } from "../errors/validationError";
import { BaseError } from "../errors/baseError";

//#endregion

export function guid(x: Guid): string {
  return x.toString().toUpperCase();
}

function id(x: Guid): string {
  return `(id: ${guid(x)})`;
}

export function flight(x: IFlight): string {
  return "Flight " + x.code;
}

export function airplaneModel(x: IAirplaneModel): string {
  return "Airplane model " + x.name;
}

export function airplane(x: IAirplane): string {
  return `Airplane ${x.model.name}(${x.landingFlight.code} -> ${x.departureFlight.code})`;
}

export function passenger(x: IPassenger): string {
  return "Passenger " + x.name;
}

export function baggage(x: IBaggage): string {
    return "Baggage " + id(x.id);
}

export function error(err: BaseError, sourceText?: string): string {
  const unexpectedError: string = "Unexpected error occured";

  if (err instanceof ValidationError) {
    err.sourceText = err.sourceText || sourceText;
  }

  let str: string = err.toString();
  if (!str || str === "Error") {
    str = unexpectedError;
  }

  return str;
}