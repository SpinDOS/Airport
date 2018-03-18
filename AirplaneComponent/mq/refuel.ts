import { IMQMessage } from "../model/validation/mqMessage";
import * as logger from "../utils/logger";
import { IRefuelReq, validateRefuelReq } from "../model/validation/refuelReq";
import { IAirplane } from "../model/airplane";
import * as airplanePool from "../airPlanePool";
import { randomInt } from "../utils/random";
import { delay } from "bluebird";
import * as assert from "../utils/assert";
import * as formatter from "../utils/formatter";
import * as mq from "./mq";

export async function refuel(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got request for refuelling");

  let fuelReq: IRefuelReq = validateRefuelReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.get(fuelReq.aircraftId);

  updateStatusStart(airplane, fuelReq);
  await refuelInternal(fuelReq, airplane);
  updateStatusEnd(airplane);

  notifyAboutEnd(fuelReq);
}

async function refuelInternal(fuelReq: IRefuelReq, airplane: IAirplane): Promise<void> {
  let volume: number = Math.min(fuelReq.volume, airplane.model.maxFuel - airplane.fuel);
  let duration: number = volume * 50;
  visualizeFuelling(fuelReq, duration);
  await delay(duration);
}

function updateStatusStart(airplane: IAirplane, fuelReq: IRefuelReq): void {
  assert.AreEqual(AirplaneStatus.OnParkingEmpty, airplane.status.type);

  airplane.status.type = AirplaneStatus.Fuelling;
  console.log(formatter.airplane(airplane) + "is being refueled");
}

function updateStatusEnd(airplane: IAirplane): void {
  airplane.status.type = AirplaneStatus.OnParkingEmpty;
  console.log(formatter.airplane(airplane) + ` has been refueled up to ${airplane.fuel}/${airplane.model.maxFuel}`);
}

function visualizeFuelling(fuelReq: IRefuelReq, duration: number): void {
  let body: any = {
    type: "fuelling",
    airplane: fuelReq.aircraftId.toString(),
    duration: duration,
  };
  mq.send(body, mq.visualizerEndpoint);
}

function notifyAboutEnd(fuelReq: IRefuelReq): void {
  let body: any = {
    service: "fuel",
    type: "fuelcomp",
    aircraftId: fuelReq.aircraftId,
  };
  mq.send(body, mq.fuelEndpoint);
}