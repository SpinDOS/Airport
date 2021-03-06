const minDuration: number = 7000;
const maxDuration: number = 15000;

//#region import

import { delay } from "bluebird";

import { IMQMessage } from "../model/validation/mqMessage";
import * as mq from "../mq/mq";

import * as logger from "../utils/logger";
import * as assert from "../utils/assert";
import * as formatter from "../utils/formatter";
import { randomInt } from "../utils/random";

import { IAirplane } from "../model/airplane";
import { AirplaneStatus } from "../model/airplaneStatus";
import * as airplanePool from "../airPlanePool";

import { ILandingReq, validateLandingReq } from "../model/validation/landingReq";

//#endregion

export async function landing(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got request for landing");

  let landingReq: ILandingReq = validateLandingReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.get(landingReq.aircraftId);

  updateStatusBefore(landingReq, airplane);
  await land(landingReq);
  updateStatusAfter(airplane);

  notifyAboutEnd(landingReq, mqMessage);
}

async function land(landingReq: ILandingReq): Promise<void> {
  let duration: number = randomInt(minDuration, maxDuration);
  visualizeLanding(landingReq, duration);
  await delay(duration);
}

//#region update status

function updateStatusBefore(landingReq: ILandingReq, airplane: IAirplane): void {
  assert.AreEqual(AirplaneStatus.WaitingForLanding, airplane.status.type);

  airplane.status.type = AirplaneStatus.Landing;
  airplane.status.additionalInfo.stripId = landingReq.stripId;
  logger.log(formatter.airplane(airplane) + " is landing to " + landingReq.stripId);
}

function updateStatusAfter(airplane: IAirplane): void {
  airplane.status.type = AirplaneStatus.WaitingForFollowMe;
  logger.log(formatter.airplane(airplane) + " has landed to " + airplane.status.additionalInfo.stripId);
}

//#endregion

function notifyAboutEnd(landingReq: ILandingReq, mqMessage: IMQMessage): void {
  let body: any = {
    service: "follow_me",
    request: "landingcomp",
    airplaneId: landingReq.aircraftId.toString()
  };

  mq.send(body, mq.followMeMQ, mqMessage.properties.correlationId);
}

function visualizeLanding(landingReq: ILandingReq, duration: number): void {
  let body: any = {
    Type: "animation",
    AnimationType: "touchdown",
    Transport: "Aircraft|" + landingReq.aircraftId.toString(),
    Strip: landingReq.stripId,
    Duration: duration,
  };

  mq.send(body, mq.visualizerMQ);
}