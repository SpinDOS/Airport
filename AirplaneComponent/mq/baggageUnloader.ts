const unloadSpeed: number = 500;

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
import { validateUnloadBaggageReq, IUnloadBaggageReq } from "../model/validation/baggageReq";
import * as helper from "../utils/loadHelper";



export async function unloadBaggage(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got MQ request to unload baggage");

  let unloadReq: IUnloadBaggageReq = validateUnloadBaggageReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.get(unloadReq.airplaneId);

  updateStatusBefore(unloadReq, airplane);
  let baggages: IBaggage[] = await unload(unloadReq, airplane);
  updateStatusAfter(unloadReq, airplane, baggages);

  notifyAboutEnd(unloadReq, baggages, mqMessage);
}

async function unload(unloadReq: IUnloadBaggageReq, airplane: IAirplane): Promise<IBaggage[]> {
  let count: number = Math.min(unloadReq.count, airplane.baggages.length);
  let duration: number = count * unloadSpeed;

  visualizeUnload(unloadReq, duration);
  await delay(duration);

  return airplane.baggages.splice(0, count);
}

function updateStatusBefore(unloadReq: IUnloadBaggageReq, airplane: IAirplane): void {
  if (airplane.baggages.length === 0) {
    throw new LogicalError("Can not unload baggage from " + formatter.airplane(airplane) + " because it is empty");
  }

  helper.startUnloading(airplane, helper.LoadTarget.Baggage, unloadReq.carId);
  logger.log(formatter.airplane(airplane) + " is unloading baggage to " + unloadReq.carId);
}

function updateStatusAfter(unloadReq: IUnloadBaggageReq, airplane: IAirplane, baggages: IBaggage[]): void {
  helper.endUnloading(airplane, helper.LoadTarget.Baggage, unloadReq.carId);

  logger.log(`Unloaded ${baggages.length} baggage from ${formatter.airplane(airplane)} to ${unloadReq.carId}. ` +
              `${airplane.baggages.length} left`);
  helper.checkUnloadEnd(airplane);
}

function notifyAboutEnd(unloadReq: IUnloadBaggageReq, baggage: IBaggage[], mqMessage: IMQMessage): void {
  if (!mqMessage.properties.replyTo) {
    logger.error("Missing 'replyTo' in unload baggage request");
    return;
  }

  let body: any = {
    carId: unloadReq.carId,
    airplaneId: unloadReq.airplaneId.toString(),
    baggage: baggage.map(b => b.id.toString())
  };

  mq.send(body, mqMessage.properties.replyTo!, mqMessage.properties.correlationId);
}

function visualizeUnload(unloadReq: IUnloadBaggageReq, duration: number): void {
  let body: any = {
    Type: "animation",
    AnimationType: "baggage",
    Transport: unloadReq.carId,
    Duration: duration,
  };

  mq.send(body, mq.visualizerMQ);
}