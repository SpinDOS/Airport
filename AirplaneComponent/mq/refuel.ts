import { delay } from "bluebird";

import * as assert from "../utils/assert";
import * as logger from "../utils/logger";
import * as formatter from "../utils/formatter";

import { IAirplane } from "../model/airplane";
import * as airplanePool from "../airPlanePool";

import { IMQMessage } from "../model/validation/mqMessage";
import * as mq from "./mq";

import { IRefuelReq, validateRefuelReq } from "../model/validation/refuelReq";
import { LogicalError } from "../errors/logicalError";


export async function refuel(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got request for refuelling");

  let fuelReq: IRefuelReq = validateRefuelReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.get(fuelReq.aircraftId);

  updateStatusStart(airplane, fuelReq);
  await refuelInternal(fuelReq, airplane);
  updateStatusEnd(airplane);
  notifyAboutEnd(fuelReq);

  logger.log(formatter.airplane(airplane) + ` has been refueled up to ${airplane.fuel}/${airplane.model.maxFuel}`);
}

async function refuelInternal(fuelReq: IRefuelReq, airplane: IAirplane): Promise<void> {
  let volume: number = Math.min(fuelReq.volume, airplane.model.maxFuel - airplane.fuel);

  if (volume <= 0) {
    throw new LogicalError(`Can not refuel ${formatter.airplane(airplane)} for ${volume} units of fuel`);
  }

  let duration: number = volume * 50;
  visualizeFuelling(fuelReq, duration);
  await delay(duration);
}

function updateStatusStart(airplane: IAirplane, fuelReq: IRefuelReq): void {
  assert.AreEqual(AirplaneStatus.OnParkingEmpty, airplane.status.type);

  airplane.status.type = AirplaneStatus.Fuelling;
  airplane.status.additionalInfo.fuelerCarId = fuelReq.carId;

  logger.log(formatter.airplane(airplane) + " is being refueled by " + fuelReq.carId);
}

function updateStatusEnd(airplane: IAirplane): void {
  airplane.status.type = AirplaneStatus.OnParkingEmpty;
  delete airplane.status.additionalInfo.fuelerCarId;
}

function visualizeFuelling(fuelReq: IRefuelReq, duration: number): void {
  let body: any = {
    Type: "animation",
    AnimationType: "fuelling",
    Transport: fuelReq.carId.toString(),
    Duration: duration,
  };

  mq.send(body, mq.visualizerMQ);
}

function notifyAboutEnd(fuelReq: IRefuelReq): void {
  let body: any = {
    request: "answer",
    aircraftid: fuelReq.aircraftId.toString(),
    fuelerid: fuelReq.carId,
    status: "ok",
  };

  mq.send(body, mq.fuelAnswerMQ);
}