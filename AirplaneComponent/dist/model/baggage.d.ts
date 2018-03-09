import { Guid } from "guid-typescript";
import { IPassenger } from "./passenger";
export interface IBaggage {
    id: Guid;
    owner?: IPassenger;
    weight: number;
}
