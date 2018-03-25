import { delay } from "bluebird";
import { Guid } from "guid-typescript";

import { IMQMessage } from "../model/validation/mqMessage";
import * as mq from "./mq";

import * as passengersAPI from "../webapi/passengersAPI";

import * as assert from "../utils/assert";
import * as formatter from "../utils/formatter";
import * as logger from "../utils/logger";

import { IAirplane } from "../model/airplane";
import * as airplanePool from "../airPlanePool";

import { validateFlyReq } from "../model/validation/fly";



const duration: number = 3000;
export async function fly(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got MQ request to fly");

  let airplaneId: Guid = validateFlyReq(mqMessage.value).airplaneId;
  let airplane: IAirplane = airplanePool.get(airplaneId);

  updateStatus(airplane);
  visualizeFly(airplane);
  await delay(duration);

  await end(airplane);
}

function updateStatus(airplane: IAirplane): void {
  assert.AreEqual(AirplaneStatus.PreparingToDeparture, airplane.status.type);
  logger.log(formatter.airplane(airplane) + " is flying from " + airplane.status.additionalInfo.stripId);
}

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

async function end(airplane: IAirplane): Promise<void> {
  notifyFollowMe(airplane);
  await notifyPassengers(airplane);

  airplanePool.remove(airplane.id);
  logger.log(formatter.airplane(airplane) + " has flown away");
}

function notifyFollowMe(airplane: IAirplane): void {
  let messageToFollowme: any = {
    service: "follow_me",
    request: "flycomp",
    aircraftId: airplane.id.toString(),
    stripId: airplane.status.additionalInfo.stripId,
  };

  mq.send(messageToFollowme, mq.followMeMQ);
}

async function notifyPassengers(airplane: IAirplane): Promise<void> {
  let body: any = {
    flight: airplane.departureFlight.id.toString(),
  };

  await passengersAPI.post("fly", body)
    .catch(e => logger.log(
      `Error notifying passengers about airplane fly: ${formatter.airplane(airplane)}. ` + e.toString()));
}