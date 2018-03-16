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

  throw new NotFoundError(key, "Can not find airplane with id: " + key);
}

export function set(airplane: IAirplane): void {
  pool[toKey(airplane.id)] = airplane;
}

export function remove(id: Guid): void {
  delete pool[toKey(id)];
}

let sync: boolean = false;

export function lock(): void {
  while (sync) {
    // wait
  }

  sync = true;
}

export function unlock(): void {
  sync = false;
}