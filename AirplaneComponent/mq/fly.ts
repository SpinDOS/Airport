import { IMQMessage } from "../model/validation/mqMessage";
import * as logger from "../utils/logger";
import { Guid } from "guid-typescript";
import { validateFly } from "../model/validation/fly";
import { IAirplane } from "../model/airplane";
import * as airplanePool from "../airPlanePool";
import * as assert from "../utils/assert";
import * as formatter from "../utils/formatter";
import * as mq from "./mq";
import { delay } from "bluebird";
import * as request from "request";
import { passengersUrl } from "../webapi/httpServer";

const duration: number = 3000;
export async function fly(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got MQ request to fly");

  let airplaneId: Guid = validateFly(mqMessage.value).airplaneId;
  let airplane: IAirplane = airplanePool.get(airplaneId);

  updateStatus(airplane);
  visualizeFly(airplane);
  await delay(duration);

  end(airplane);
}

function updateStatus(airplane: IAirplane): void {
  assert.AreEqual(AirplaneStatus.PreparingToDeparture, airplane.status.type);
  logger.log(formatter.airplane(airplane) + " is flying");
}

function visualizeFly(airplane: IAirplane): void {
  let message: any = {
    Type: "animation",
    AnimationType: "wheelsup",
    Transport: "Aircraft|" + airplane.id.toString(),
    Strip: airplane.status.additionalInfo.stripId,
    Duration: duration,
  };

  mq.send(message, mq.visualizerEndpoint);
}

function end(airplane: IAirplane): void {
  airplanePool.remove(airplane.id);

  let messageToFollowme: any = {
    service: "follow_me",
    request: "flycomp",
    aircraftId: airplane.id.toString(),
    stripId: airplane.status.additionalInfo.stripId,
  };
  mq.send(messageToFollowme, mq.followMeEndpoint);

  let passengersRequestBody: any = { flight: airplane.departureFlight.id.toString() };
  request.post(passengersUrl + "fly", {
    headers: { "content-type": "application/json" },
    body: JSON.stringify(passengersRequestBody),
  }, (_, err) => {
    if (err) {
      logger.error("Error notifying passengers about airplane fly: " + formatter.airplane(airplane));
    }
  });

  logger.log(formatter.airplane(airplane) + " has flown away");
}