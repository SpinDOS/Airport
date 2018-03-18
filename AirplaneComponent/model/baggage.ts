import { Guid } from "guid-typescript";
import { IPassenger } from "./passenger";

export interface IBaggage {
  readonly id: Guid;
}