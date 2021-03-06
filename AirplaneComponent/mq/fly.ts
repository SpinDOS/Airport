const duration: number = 10000;

//#region import

import { delay } from "bluebird";
import { Guid } from "guid-typescript";

import { IMQMessage } from "../model/validation/mqMessage";
import * as mq from "./mq";

import * as passengersAPI from "../webapi/passengersAPI";

import * as assert from "../utils/assert";
import * as formatter from "../utils/formatter";
import * as logger from "../utils/logger";

import { IAirplane } from "../model/airplane";
import { AirplaneStatus } from "../model/airplaneStatus";
import * as airplanePool from "../airPlanePool";

import { validateFlyReq } from "../model/validation/fly";

//#endregion

export async function fly(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got MQ request to fly");

  let airplaneId: Guid = validateFlyReq(mqMessage.value).airplaneId;
  let airplane: IAirplane = airplanePool.get(airplaneId);

  updateStatusBefore(airplane);
  await doFly(airplane);
  updateStatusAfter(airplane);

  await notifyAboutEnd(airplane, mqMessage);
}

async function doFly(airplane: IAirplane): Promise<void> {
  visualizeFly(airplane);
  await delay(duration);
}

//#region update status

function updateStatusBefore(airplane: IAirplane): void {
  assert.AreEqual(AirplaneStatus.PreparingToDeparture, airplane.status.type);
  airplane.status.type = AirplaneStatus.Departuring;
  logger.log(formatter.airplane(airplane) + " is flying from " + airplane.status.additionalInfo.stripId);
}

function updateStatusAfter(airplane: IAirplane): void {
  airplanePool.remove(airplane.id);
  logger.log(formatter.airplane(airplane) + " has flown away");
}

//#endregion

//#region notify

async function notifyAboutEnd(airplane: IAirplane, mqMessage: IMQMessage): Promise<void> {
  await notifyPassengers(airplane);
  notifyFollowMe(airplane, mqMessage);
}

async function notifyPassengers(airplane: IAirplane): Promise<void> {
  let newStatus: string = "FlewAway";
  let transportId: string = airplane.id.toString();
  let passengers: Guid[] = airplane.passengers.map(p => p.id);

  await passengersAPI.changeStatus(newStatus, transportId, passengers).catch(e => logger.error(
      `Error notifying passengers about airplane fly: ${formatter.airplane(airplane)}. ` + e.toString()));
}

function notifyFollowMe(airplane: IAirplane, mqMessage: IMQMessage): void {
  let messageToFollowme: any = {
    service: "follow_me",
    request: "flycomp",
    aircraftId: airplane.id.toString(),
    stripId: airplane.status.additionalInfo.stripId,
  };

  mq.send(messageToFollowme, mq.followMeMQ, mqMessage.properties.correlationId);
}

//#endregion

function visualizeFly(airplane: IAirplane): void {
  let message: any = {
    Type: "animation",
    AnimationType: "wheelsup",
    Transport: "Aircraft|" + airplane.id.toString(),
    Strip: airplane.status.additionalInfo.stripId,
    Duration: duration,
  };

  mq.send(message, mq.visualizerMQ);
}