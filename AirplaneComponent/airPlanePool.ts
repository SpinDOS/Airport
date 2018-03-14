import { IAirplane } from "./model/airplane";
import { Guid } from "guid-typescript";

export let pool: { [id: string]: IAirplane } = {};

export function toKey(id: Guid): string {
  return id.toString().toUpperCase();
}

export function get(id: Guid): IAirplane | undefined {
  return pool[toKey(id)];
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