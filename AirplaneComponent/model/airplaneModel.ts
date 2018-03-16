import { random0toMax } from "../utils/random";

export interface AirplaneModel {
  readonly name: string,
  readonly maxFuel: number,
  readonly maxPassengersCount: number,
  readonly maxBaggageWeight: number,
}

export function findRandomModel(passengersCount: number, baggageWeight: number) : AirplaneModel {
  let matching = allModels.filter(model => model.maxPassengersCount >= passengersCount && model.maxBaggageWeight >= baggageWeight);
  if (matching.length == 0) 
    throw Error(`Can not find model that can carry ${passengersCount} passengers and ${baggageWeight} kg of baggage`);
  return matching[random0toMax(matching.length)];
}

export let allModels: AirplaneModel[] = [
  {
    name: 'Boeing 747',
    maxFuel: 100,
    maxPassengersCount: 1000,
    maxBaggageWeight: 1000,
  }
]