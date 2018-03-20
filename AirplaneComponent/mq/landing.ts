import { IMQMessage } from "../model/validation/mqMessage";
import * as logger from "../utils/logger";
import { ILandingReq, validateLandingReq } from "../model/validation/landingReq";
import * as airplanePool from "../airPlanePool";
import { IAirplane } from "../model/airplane";
import * as assert from "../utils/assert";
import * as formatter from "../utils/formatter";
import * as mq from "../mq/mq";
import { Message } from "amqp-ts";
import { delay } from "bluebird";
import { randomInt } from "../utils/random";

export async function landing(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got request for landing");

  let landingReq: ILandingReq = validateLandingReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.get(landingReq.aircraftId);

  updateStatusStart(airplane, landingReq);
  await land(landingReq);
  updateStatusEnd(airplane);

  notifyAboutEnd(landingReq);
}

async function land(landingReq: ILandingReq): Promise<void> {
  let duration: number = randomInt(1000, 10000);
  visualizeLanding(landingReq, duration);
  await delay(duration);
}

function updateStatusStart(airplane: IAirplane, landingReq: ILandingReq): void {
  assert.AreEqual(AirplaneStatus.WaitingForLanding, airplane.status.type);

  airplane.status.type = AirplaneStatus.Landing;
  airplane.status.additionalInfo.stripId = landingReq.stripId;
  console.log(formatter.airplane(airplane) + "is landing to " + landingReq.stripId);
}

function updateStatusEnd(airplane: IAirplane): void {
  airplane.status.type = AirplaneStatus.WaitingForFollowMe;
  console.log(formatter.airplane(airplane) + "has landed to " + airplane.status.additionalInfo.stripId);
}

function visualizeLanding(landingReq: ILandingReq, duration: number): void {
  let body: any = {
    Type: "animation",
    AnimationType: "touchdown",
    Transport: "Aircraft|" + landingReq.aircraftId.toString(),
    Strip: landingReq.stripId,
    Duration: duration,
  };
  mq.send(body, mq.visualizerEndpoint);
}

function notifyAboutEnd(landingReq: ILandingReq): void {
  let body: any = {
    service: "follow_me",
    request: "landingcomp",
    fmId: landingReq.aircraftId.toString()
  };
  mq.send(body, mq.followMeEndpoint);
}