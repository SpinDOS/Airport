import { IFlight } from "../model/Flight";
import { IAirplane } from "../model/airplane";
import { IAirplaneModel } from "../model/airplaneModel";
import { Guid } from "guid-typescript";
import { IBaggage } from "../model/baggage";
import { IPassenger } from "../model/passenger";

export function guid(x: Guid): string {
  return x.toString().toUpperCase();
}

export function id(x: Guid): string {
  return `(id: ${guid(x)})`;
}

export function flight(x: IFlight): string {
  return "Flight " + (x.code || id(x.id));
}

export function airplaneModel(x: IAirplaneModel): string {
  return "Airplane model " + x.name;
}

export function airplane(x: IAirplane): string {
  return `Airplane ${x.model.name}${id(x.id)}`;
}

export function passenger(x: IPassenger): string {
  return "Passenger " + (x.name || id(x.id));
}

export function baggage(x: IBaggage): string {
  if (!x.owner) {
    return "Baggage " + id(x.id);
  }

  if (x.owner.name) {
    return x.owner.name + "'s baggage";
  } else {
    return `Passenger (${guid(x.owner.id)})'s baggage`;
  }
}