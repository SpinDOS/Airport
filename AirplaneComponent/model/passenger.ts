import { Guid } from "guid-typescript";

export interface IPassenger {
  readonly id: Guid;
  readonly name: string;
  readonly baggageId?: Guid;
}