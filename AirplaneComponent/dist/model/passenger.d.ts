import { Guid } from "guid-typescript";
import { Baggage } from "./baggage";
export interface Passenger {
    id: Guid;
    name?: string;
    baggage?: Baggage;
}
