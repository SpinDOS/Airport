const loadSpeed: number = 600;

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


export async function loadBaggage(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got MQ request to load baggage");

  let loadReq: ILoadBaggageReq = validateLoadBaggageReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.get(loadReq.airplaneId);

  updateStatusBeforeLoad(airplane, loadReq);
  await load(loadReq, airplane);
  notifyAboutLoadEnd(loadReq, mqMessage);
  updateStatusAfterLoad(airplane, loadReq);
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

function updateStatusBeforeLoad(airplane: IAirplane, loadReq: ILoadBaggageReq): void {
  if (airplane.departureFlight.baggageCount - airplane.baggages.length < loadReq.baggages.length) {
    throw new LogicalError(`Too many baggage to load ${loadReq.baggages.length} into ` + formatter.airplane(airplane));
  }

  helper.startLoading(airplane, helper.LoadTarget.Baggage, loadReq.carId);
  logger.log(formatter.airplane(airplane) + " is loading baggage from " + loadReq.carId);
}

function updateStatusAfterLoad(airplane: IAirplane, loadReq: ILoadBaggageReq): void {
  helper.endLoading(airplane, helper.LoadTarget.Baggage, loadReq.carId);

  logger.log(`Loaded ${loadReq.baggages.length} baggage from ${loadReq.carId}. ` +
              `${airplane.baggages.length} total`);
  helper.checkLoadEnd(airplane);
}

function notifyAboutLoadEnd(loadReq: ILoadBaggageReq, mqMessage: IMQMessage): void {
  if (!mqMessage.properties.replyTo) {
    throw new ValidationError("Missing 'replyTo' in load baggage request");
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


