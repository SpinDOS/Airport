import { Guid } from "guid-typescript";
import { IPassenger } from "./passenger";

export interface IBaggage {
  id: Guid,
  weight: number,
  owner?: IPassenger,
}