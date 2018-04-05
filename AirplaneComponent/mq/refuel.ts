const refuelSpeed: number = 150;

//#region import

import { delay } from "bluebird";

import * as assert from "../utils/assert";
import * as logger from "../utils/logger";
import * as formatter from "../utils/formatter";

import { IAirplane } from "../model/airplane";
import { AirplaneStatus } from "../model/airplaneStatus";
import * as airplanePool from "../airPlanePool";

import { IMQMessage } from "../model/validation/mqMessage";
import * as mq from "./mq";

import { IRefuelReq, validateRefuelReq } from "../model/validation/refuelReq";
import { LogicalError } from "../errors/logicalError";

//#endregion

export async function refuel(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got request for refuelling");

  let fuelReq: IRefuelReq = validateRefuelReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.get(fuelReq.aircraftId);

  let volume: number = updateStatusBefore(fuelReq, airplane);
  await doRefuel(fuelReq, airplane, volume);
  updateStatusAfter(airplane);

  notifyAboutEnd(fuelReq, volume, mqMessage);
}

async function doRefuel(fuelReq: IRefuelReq, airplane: IAirplane, volume: number): Promise<void> {
  let duration: number = volume * refuelSpeed;
  visualizeFuelling(fuelReq, duration);
  await delay(duration);
  airplane.fuel += volume;
}

//#region update

function updateStatusBefore(fuelReq: IRefuelReq, airplane: IAirplane): number {
  assert.AreEqual(AirplaneStatus.OnParkingEmpty, airplane.status.type);
  let volume: number = Math.min(fuelReq.volume, airplane.model.maxFuel - airplane.fuel);

  if (volume <= 0) {
    throw new LogicalError(`Can not refuel ${formatter.airplane(airplane)} for ${volume} units of fuel`);
  }

  airplane.status.type = AirplaneStatus.Fuelling;
  airplane.status.additionalInfo.fuelerCarId = fuelReq.carId;

  logger.log(formatter.airplane(airplane) + " is being refueled by " + fuelReq.carId);
  return volume;
}

function updateStatusAfter(airplane: IAirplane): void {
  airplane.status.type = AirplaneStatus.OnParkingEmpty;
  delete airplane.status.additionalInfo.fuelerCarId;
  logger.log(formatter.airplane(airplane) + ` has been refueled up to ${airplane.fuel}/${airplane.model.maxFuel}`);
}

//#endregion

function notifyAboutEnd(fuelReq: IRefuelReq, volume: number, mqMessage: IMQMessage): void {
  let body: any = {
    request: "answer",
    aircraftId: fuelReq.aircraftId.toString(),
    fuelerId: fuelReq.carId,
    fuelUsed: volume,
    status: "ok",
  };

  mq.send(body, mq.fuelAnswerMQ, mqMessage.properties.correlationId);
}

function visualizeFuelling(fuelReq: IRefuelReq, duration: number): void {
  let body: any = {
    Type: "animation",
    AnimationType: "filling",
    Transport: fuelReq.carId.toString(),
    Duration: duration,
  };

  mq.send(body, mq.visualizerMQ);
}