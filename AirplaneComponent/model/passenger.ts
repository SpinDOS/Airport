import { Guid } from "guid-typescript";
import { IBaggage } from "./baggage";

export interface IPassenger {
  readonly id: Guid;
  readonly name: string;
  readonly baggageId?: Guid;
}