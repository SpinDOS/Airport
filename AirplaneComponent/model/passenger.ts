import { Guid } from "guid-typescript";
import { IBaggage } from "./baggage";

export interface IPassenger {
  id: Guid;
  name?: string;
  baggage?: IBaggage;
}