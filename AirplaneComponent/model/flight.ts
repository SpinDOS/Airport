import { Guid } from "guid-typescript";

export interface IFlight {
  id: Guid;
  code?: string;
}