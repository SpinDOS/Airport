import { random0toMax } from "../utils/random";
import { LogicalError } from "../errors/logicalError";

export interface IAirplaneModel {
  readonly name: string;
  readonly maxFuel: number;
  readonly maxPassengersCount: number;
  readonly maxBaggageCount: number;
}

export function generateRandomModel(passengersCount: number, baggageCount: number): IAirplaneModel {
  let matching: IAirplaneModel[] = allModels.filter(
    model => model.maxPassengersCount >= passengersCount &&
             model.maxBaggageCount >= baggageCount);

  if (matching.length === 0) {
    throw new LogicalError(`Can not find model to can carry ${passengersCount} passengers and ${baggageCount} baggage`);
  }

  return matching[random0toMax(matching.length)];
}

export let allModels: IAirplaneModel[] = [
  {
    name: "Boeing 747",
    maxFuel: 100,
    maxPassengersCount: 10000,
    maxBaggageCount: 10000,
  }
];