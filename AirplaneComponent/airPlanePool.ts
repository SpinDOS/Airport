import { IAirplane } from "./model/airplane";
import { Guid } from "guid-typescript";
import { NotFoundError } from "./errors/notFoundError";

export let pool: { [id: string]: IAirplane } = {};

export function toKey(id: Guid): string {
  return id.toString().toUpperCase();
}

export function tryGet(id: Guid): IAirplane | undefined {
  return pool[toKey(id)];
}

export function get(id: Guid): IAirplane {
  let key: string = toKey(id);

  let result: IAirplane | undefined = pool[key];
  if (result) {
    return result;
  }

  throw new NotFoundError(key, `Airplane with id '${id.toString()}' not found`);
}

export function set(airplane: IAirplane): void {
  pool[toKey(airplane.id)] = airplane;
}

export function remove(id: Guid): void {
  delete pool[toKey(id)];
}

export function byLandingFlight(flightId: Guid): IAirplane {
  for (let key in pool) {
    if (flightId.equals(pool[key].landingFlight.id)) {
      return pool[key];
    }
  }
  throw new NotFoundError(flightId.toString(),
    `Airplane with landing flight '${flightId.toString()}' not found`);
}

export function byDepartureFlight(flightId: Guid): IAirplane {
  for (let key in pool) {
    if (flightId.equals(pool[key].departureFlight.id)) {
      return pool[key];
    }
  }
  throw new NotFoundError(flightId.toString(),
    `Airplane with departure flight '${flightId.toString()}' not found`);
}