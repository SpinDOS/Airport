import { Guid } from "guid-typescript";
import { Passenger } from "./passenger";
export interface Baggage {
    id: Guid;
    weight: number;
    owner?: Passenger;
}
