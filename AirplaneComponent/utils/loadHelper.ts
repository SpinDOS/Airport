//#region import

import * as assert from "./assert";
import * as logger from "./logger";
import * as formatter from "./formatter";

import { IAirplane } from "../model/airplane";
import { AirplaneStatus } from "../model/airplaneStatus";

import { LogicalError } from "../errors/logicalError";

//#endregion


export const enum LoadTarget {
  Passengers,
  Baggage,
}

//#region unloading

export function startUnloading(airplane: IAirplane, target: LoadTarget, carId: string): void {
  if (airplane.status.type === AirplaneStatus.OnParkingAfterLandingLoaded) {
    airplane.status.type = AirplaneStatus.UnloadingPassengersAndBaggage;
  } else {
    assert.AreEqual(AirplaneStatus.UnloadingPassengersAndBaggage, airplane.status.type);
  }
  addCar(airplane, target, carId);
}

export function endUnloading(airplane: IAirplane, target: LoadTarget, carId: string): void {
  removeCar(airplane, target, carId);
}

//#endregion

//#region loading

export function startLoading(airplane: IAirplane, target: LoadTarget, carId: string): void {
  if (airplane.status.type === AirplaneStatus.OnParkingEmpty) {
    airplane.status.type = AirplaneStatus.LoadingPassengersAndBaggage;
  } else {
    assert.AreEqual(AirplaneStatus.LoadingPassengersAndBaggage, airplane.status.type);
  }

  addCar(airplane, target, carId);
}

export function endLoading(airplane: IAirplane, target: LoadTarget, carId: string): void {
  removeCar(airplane, target, carId);
}

//#endregion


//#region checks for end

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

//#endregion


//#region helpers

function addCar(airplane: IAirplane, target: LoadTarget, carId: string): void {
  let collectionName: "buses" | "baggageCars" = getCollectionName(target);

  if (!airplane.status.additionalInfo[collectionName]) {
    airplane.status.additionalInfo[collectionName] = [];
  }
  airplane.status.additionalInfo[collectionName]!.push(carId);
}

function removeCar(airplane: IAirplane, target: LoadTarget, carId: string): void {
  let collectionName: "buses" | "baggageCars" = getCollectionName(target);
  let arr: Array<string> = airplane.status.additionalInfo[collectionName]!;

  let index: number = arr.findIndex(c => c === carId);
  arr.splice(index, 1);

  if (arr.length === 0) {
    delete airplane.status.additionalInfo[collectionName];
  }
}

function getCollectionName(target: LoadTarget): "buses" | "baggageCars" {
  return target === LoadTarget.Passengers? "buses": "baggageCars";
}

//#endregion