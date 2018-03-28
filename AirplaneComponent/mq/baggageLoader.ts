const loadSpeed: number = 600;

//#region import

import { delay } from "bluebird";

import * as mq from "./mq";
import { IMQMessage } from "../model/validation/mqMessage";

import * as logger from "../utils/logger";
import * as formatter from "../utils/formatter";
import * as assert from "../utils/assert";

import { ValidationError } from "../errors/validationError";
import { LogicalError } from "../errors/logicalError";

import { IAirplane } from "../model/airplane";
import * as airplanePool from "../airPlanePool";

import { IBaggage } from "../model/baggage";
import { ILoadBaggageReq, validateLoadBaggageReq } from "../model/validation/baggageReq";
import * as helper from "../utils/loadHelper";

//#endregion

export async function loadBaggage(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got MQ request to load baggage");

  let loadReq: ILoadBaggageReq = validateLoadBaggageReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.get(loadReq.airplaneId);

  updateStatusBefore(loadReq, airplane);
  await load(loadReq, airplane);
  updateStatusAfter(loadReq, airplane);

  notifyAboutEnd(loadReq, mqMessage);
}

async function load(loadReq: ILoadBaggageReq, airplane: IAirplane): Promise<void> {
  let duration: number = loadReq.baggages.length * loadSpeed;

  visualizeLoad(loadReq, duration);
  await delay(duration);

  for(let guid of loadReq.baggages) {
    let baggage: IBaggage = { id: guid };
    airplane.baggages.push(baggage);
  }
}

//#region update status

function updateStatusBefore(loadReq: ILoadBaggageReq, airplane: IAirplane): void {
  if (airplane.departureFlight.baggageCount - airplane.baggages.length < loadReq.baggages.length) {
    throw new LogicalError(`Too many baggage to load ${loadReq.baggages.length} into ` + formatter.airplane(airplane));
  }

  helper.startLoading(airplane, helper.LoadTarget.Baggage, loadReq.carId);
  logger.log(formatter.airplane(airplane) + " is loading baggage from " + loadReq.carId);
}

function updateStatusAfter(loadReq: ILoadBaggageReq, airplane: IAirplane): void {
  helper.endLoading(airplane, helper.LoadTarget.Baggage, loadReq.carId);

  logger.log(`Loaded ${loadReq.baggages.length} baggage from ${loadReq.carId}. ` +
              `${airplane.baggages.length} total`);
  helper.checkLoadEnd(airplane);
}

//#endregion

function notifyAboutEnd(loadReq: ILoadBaggageReq, mqMessage: IMQMessage): void {
  if (!mqMessage.properties.replyTo) {
    logger.error("Missing 'replyTo' in load baggage request");
    return;
  }

  let body: any = {
    result: "ok",
    carId: loadReq.carId,
    airplaneId: loadReq.airplaneId.toString()
  };

  mq.send(body, mqMessage.properties.replyTo!, mqMessage.properties.correlationId);
}

function visualizeLoad(unloadReq: ILoadBaggageReq, duration: number): void {
  let body: any = {
    Type: "animation",
    AnimationType: "baggage",
    Transport: unloadReq.carId.toString(),
    Duration: duration,
  };

  mq.send(body, mq.visualizerMQ);
}