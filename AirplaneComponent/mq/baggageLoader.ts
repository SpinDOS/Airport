import * as mq from "./mq";
import * as logger from "../utils/logger";
import * as airplanePool from "../airPlanePool";
import { IBaggage } from "../model/baggage";
import { IMQMessage } from "../model/validation/mqMessage";
import { ValidationError } from "../errors/validationError";
import { IAirplane } from "../model/airplane";
import { NotFoundError } from "../errors/notFoundError";
import { Guid } from "guid-typescript";
import * as assert from "../utils/assert";
import { validateUnloadBaggageReq, IUnloadBaggageReq,
  ILoadBaggageReq, validateLoadBaggageReq } from "../model/validation/baggageReq";
import { Message } from "amqp-ts";
import { delay } from "bluebird";
import * as formatter from "../utils/formatter";
import { LogicalError } from "../errors/logicalError";

export async function unloadBaggage(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got MQ request to unload baggage");

  let unloadReq: IUnloadBaggageReq = validateUnloadBaggageReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.byLandingFlight(unloadReq.landingFlightId);

  updateStatusBeforeUnload(airplane, unloadReq.carId);
  let baggage: IBaggage[] = await unload(unloadReq, airplane);
  updateStatusAfterUnload(airplane, unloadReq.carId);

  notifyAboutUnload(baggage, unloadReq, mqMessage);
  logger.log(`Unloaded ${baggage.length} baggage. ${airplane.baggages.length} left`);
}

async function unload(unloadReq: IUnloadBaggageReq, airplane: IAirplane): Promise<IBaggage[]> {
  let result: IBaggage[] = [];
  for (let i: number = 0; i < Math.min(unloadReq.count, airplane.baggages.length); i++) {
    await delay(100);
    result.push(airplane.baggages.pop() as IBaggage);
  }
  return result;
}

function updateStatusBeforeUnload(airplane: IAirplane, carId: string): void {
  if (airplane.baggages.length === 0) {
    throw new LogicalError("No baggage found to unload");
  }

  if (airplane.status.type === AirplaneStatus.OnParkingAfterLandingLoaded) {
    airplane.status.type = AirplaneStatus.UnloadingPassengersAndBaggage;
  } else {
    assert.AreEqual(AirplaneStatus.UnloadingPassengersAndBaggage, airplane.status.type);
  }
  addCar(airplane, carId, "baggageCars");
  logger.log(formatter.airplane(airplane) + " is unloading baggage to " + carId);
}

function updateStatusAfterUnload(airplane: IAirplane, carId: string): void {
  logger.log(formatter.airplane(airplane) + " finished unloading baggage to " + carId);
  checkUnloadEnd(airplane);
  removeCar(airplane, carId, "baggageCars");
}

function notifyAboutUnload(baggage: IBaggage[], unloadReq: IUnloadBaggageReq, mqMessage: IMQMessage): void {
  if (!mqMessage.replyTo) {
    throw new ValidationError("Missing 'replyTo' in unload baggage request");
  }

  let body: any = {
    carId: unloadReq.carId,
    baggage: baggage.map(b => b.id.toString())
  };
  mq.send(body, mq.getQueueOrExchange(mqMessage.replyTo), mqMessage.correlationId);
}




export async function loadBaggage(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got MQ request to load baggage");

  let loadReq: ILoadBaggageReq = validateLoadBaggageReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.byDepartureFlight(loadReq.departureFlightId);

  updateStatusBeforeLoad(airplane, loadReq.carId);
  await load(loadReq, airplane);
  updateStatusAfterLoad(airplane, loadReq.carId);

  notifyAboutLoadEnd(loadReq, mqMessage);
  logger.log(`Loaded ${loadReq.baggages.length} baggage. ${airplane.baggages.length} total`);
}

async function load(loadReq: ILoadBaggageReq, airplane: IAirplane): Promise<void> {
  for (let i: number = 0; i < loadReq.baggages.length; i++) {
    await delay(100);
    if (airplane.baggages.length === airplane.departureFlight.baggageCount) {
      throw new LogicalError("Too many baggage is beeing loaded");
    }
    airplane.baggages.push({ id: loadReq.baggages[i] });
  }
}

function updateStatusBeforeLoad(airplane: IAirplane, carId: string): void {
  if (airplane.status.type === AirplaneStatus.OnParkingEmpty) {
    airplane.status.type = AirplaneStatus.LoadingPassengersAndBaggage;
  } else {
    assert.AreEqual(AirplaneStatus.LoadingPassengersAndBaggage, airplane.status.type);
  }
  addCar(airplane, carId, "baggageCars");
  logger.log(formatter.airplane(airplane) + " is loading baggage from " + carId);
}

function updateStatusAfterLoad(airplane: IAirplane, carId: string): void {
  logger.log(formatter.airplane(airplane) + " finished loading baggage from " + carId);
  removeCar(airplane, carId, "baggageCars");
  checkLoadEnd(airplane);
}

function notifyAboutLoadEnd(loadReq: ILoadBaggageReq, mqMessage: IMQMessage): void {
  if (!mqMessage.replyTo) {
    throw new ValidationError("Missing 'replyTo' in load baggage request");
  }

  let body: any = {
    carId: loadReq.carId,
    result: "OK",
  };
  mq.send(body, mq.getQueueOrExchange(mqMessage.replyTo), mqMessage.correlationId);
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



export function addCar(airplane: IAirplane, carId: string, collectionName: "buses" | "baggageCars"): void {
  if (!airplane.status.additionalInfo[collectionName]) {
    airplane.status.additionalInfo[collectionName] = [];
  }
  airplane.status.additionalInfo[collectionName]!.push(carId);
}

export function removeCar(airplane: IAirplane, carId: string, collectionName: "buses" | "baggageCars"): void {
  let arr: Array<string> = airplane.status.additionalInfo[collectionName]!;

  for (let i: number = 0; i < arr.length; i++) {
    if (arr[i] === carId) {
      arr.splice(i, 1);
      break;
    }
  }

  if (arr.length === 0) {
    delete airplane.status.additionalInfo[collectionName];
  }
}