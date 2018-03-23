import * as assert from "./assert";
import * as logger from "./logger";
import * as formatter from "./formatter";

import { IAirplane } from "../model/airplane";


export type airplaneCollectionName = "buses" | "baggageCars";

export function startUnloading(airplane: IAirplane, collectionName: airplaneCollectionName, carId: string): void {
  if (airplane.status.type === AirplaneStatus.OnParkingAfterLandingLoaded) {
    airplane.status.type = AirplaneStatus.UnloadingPassengersAndBaggage;
  } else {
    assert.AreEqual(AirplaneStatus.UnloadingPassengersAndBaggage, airplane.status.type);
  }

  addCar(airplane, collectionName, carId);
}

export function endUnloading(airplane: IAirplane, collectionName: airplaneCollectionName, carId: string): void {
  removeCar(airplane, collectionName, carId);
}

export function startLoading(airplane: IAirplane, collectionName: airplaneCollectionName, carId: string): void {
  if (airplane.status.type === AirplaneStatus.OnParkingEmpty) {
    airplane.status.type = AirplaneStatus.LoadingPassengersAndBaggage;
  } else {
    assert.AreEqual(AirplaneStatus.LoadingPassengersAndBaggage, airplane.status.type);
  }

  addCar(airplane, collectionName, carId);
}

export function endLoading(airplane: IAirplane, collectionName: airplaneCollectionName, carId: string): void {
  removeCar(airplane, collectionName, carId);
}

export function checkUnloadEnd(airplane: IAirplane): boolean {
  if (airplane.baggages.length !== 0 || airplane.passengers.length!== 0) {
    return false;
  }

  airplane.status.type = AirplaneStatus.OnParkingEmpty;
  logger.log(formatter.airplane(airplane) + " has finished unloading baggage and passengers");
  return true;
}

export function checkLoadEnd(airplane: IAirplane): boolean {
  if (airplane.baggages.length !== airplane.departureFlight.baggageCount ||
    airplane.passengers.length !== airplane.departureFlight.passengersCount) {
      return false;
  }

  airplane.status.type = AirplaneStatus.OnParkingBeforeDepartureLoaded;
  logger.log(formatter.airplane(airplane) + " is loaded for the next flight");
  return true;
}


function addCar(airplane: IAirplane, collectionName: airplaneCollectionName, carId: string): void {
  if (!airplane.status.additionalInfo[collectionName]) {
    airplane.status.additionalInfo[collectionName] = [];
  }
  airplane.status.additionalInfo[collectionName]!.push(carId);
}

function removeCar(airplane: IAirplane, collectionName: airplaneCollectionName, carId: string): void {
  let arr: Array<string> = airplane.status.additionalInfo[collectionName]!;

  let index: number = arr.findIndex(c => c === carId);
  arr.splice(index, 1);

  if (arr.length === 0) {
    delete airplane.status.additionalInfo[collectionName];
  }
}