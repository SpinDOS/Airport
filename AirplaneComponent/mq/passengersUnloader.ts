const unloadSpeed: number = 400;
import { delay } from "bluebird";

import * as mq from "./mq";
import { IMQMessage } from "../model/validation/mqMessage";

import * as logger from "../utils/logger";
import * as formatter from "../utils/formatter";

import { ValidationError } from "../errors/validationError";

import { IPassenger } from "../model/passenger";
import { IAirplane } from "../model/airplane";
import * as airplanePool from "../airPlanePool";

import * as passengersAPI from "../webapi/passengersAPI";

import * as helper from "../utils/loadHelper";
import { IUnloadPassengersReq, validateUnloadPasReq } from "../model/validation/passengersReq";



export async function unloadPassengers(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got MQ request to unload passengers");

  let unloadReq: IUnloadPassengersReq = validateUnloadPasReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.get(unloadReq.airplaneId);

  updateStatusBeforeUnload(airplane, unloadReq);
  let passengers: IPassenger[] = await unload(unloadReq, airplane);
  notifyAboutUnloadEnd(passengers, unloadReq, mqMessage);
  updateStatusAfterUnload(airplane, unloadReq, passengers);
}

async function unload(unloadReq: IUnloadPassengersReq, airplane: IAirplane): Promise<IPassenger[]> {
  let count: number = Math.min(unloadReq.count, airplane.passengers.length);
  let duration: number = count * unloadSpeed;

  let passengers: IPassenger[] = airplane.passengers.splice(0, count);
  changePassengersStatus(unloadReq, passengers);
  visualizeUnload(unloadReq, duration);
  await delay(duration);

  return passengers;
}

function updateStatusBeforeUnload(airplane: IAirplane, unloadReq: IUnloadPassengersReq): void {
  helper.startUnloading(airplane, "buses", unloadReq.busId);
  logger.log(formatter.airplane(airplane) + " is unloading passengers to " + unloadReq.busId);
}

function updateStatusAfterUnload(airplane: IAirplane, unloadReq: IUnloadPassengersReq, passengers: IPassenger[]): void {
  helper.endUnloading(airplane, "buses", unloadReq.busId);

  logger.log(`Unloaded ${passengers.length} passengers from ${formatter.airplane(airplane)} to ${unloadReq.busId}. ` +
              `${airplane.passengers.length} left`);
  helper.checkUnloadEnd(airplane);
}

async function changePassengersStatus(unloadReq: IUnloadPassengersReq, passengers: IPassenger[]): Promise<void> {
  let body: object = {
    newStatus: "UnloadingFromAirplaneToBus",
    busId: unloadReq.busId,
    passengers: passengers.map(p => p.id.toString())
  };

  await passengersAPI.post("changeStatus", body);
}

function notifyAboutUnloadEnd(passengers: IPassenger[], unloadReq: IUnloadPassengersReq, mqMessage: IMQMessage): void {
  if (!mqMessage.properties.replyTo) {
    throw new ValidationError("Missing 'replyTo' in unload passengers request");
  }

  let body: any = {
    busId: unloadReq.busId,
    airplaneId: unloadReq.airplaneId.toString(),
    passengers: passengers.map(p => p.id.toString())
  };

  mq.send(body, mqMessage.properties.replyTo!, mqMessage.properties.correlationId);
}

function visualizeUnload(unloadReq: IUnloadPassengersReq, duration: number): void {
  let body: any = {
    Type: "animation",
    AnimationType: "passengers",
    Transport: unloadReq.busId,
    Duration: duration,
  };

  mq.send(body, mq.visualizerMQ);
}