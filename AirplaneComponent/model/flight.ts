import { Guid } from "guid-typescript";

export interface IFlight {
  readonly id: Guid;
  readonly code: string;
  readonly passengersCount: number;
  readonly baggageCount: number;
}