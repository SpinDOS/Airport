const minDuration: number = 7000;
const maxDuration: number = 15000;

import { delay } from "bluebird";

import { IMQMessage } from "../model/validation/mqMessage";
import * as mq from "../mq/mq";

import * as logger from "../utils/logger";
import * as assert from "../utils/assert";
import * as formatter from "../utils/formatter";
import { randomInt } from "../utils/random";

import { IAirplane } from "../model/airplane";
import * as airplanePool from "../airPlanePool";

import { ILandingReq, validateLandingReq } from "../model/validation/landingReq";


export async function landing(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got request for landing");

  let landingReq: ILandingReq = validateLandingReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.get(landingReq.aircraftId);

  updateStatusStart(airplane, landingReq);
  await land(landingReq);
  notifyAboutEnd(landingReq);
  updateStatusEnd(airplane);
}

async function land(landingReq: ILandingReq): Promise<void> {
  let duration: number = randomInt(minDuration, maxDuration);
  visualizeLanding(landingReq, duration);
  await delay(duration);
}

function updateStatusStart(airplane: IAirplane, landingReq: ILandingReq): void {
  assert.AreEqual(AirplaneStatus.WaitingForLanding, airplane.status.type);

  airplane.status.type = AirplaneStatus.Landing;
  airplane.status.additionalInfo.stripId = landingReq.stripId;
  logger.log(formatter.airplane(airplane) + " is landing to " + landingReq.stripId);
}

function updateStatusEnd(airplane: IAirplane): void {
  airplane.status.type = AirplaneStatus.WaitingForFollowMe;
  logger.log(formatter.airplane(airplane) + " has landed to " + airplane.status.additionalInfo.stripId);
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

function notifyAboutEnd(landingReq: ILandingReq): void {
  let body: any = {
    service: "follow_me",
    request: "landingcomp",
    fmId: landingReq.aircraftId.toString()
  };

  mq.send(body, mq.followMeMQ);
}