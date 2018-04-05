const unloadSpeed: number = 400;

//#region import

import { Guid } from "guid-typescript";
import { delay } from "bluebird";

import * as mq from "./mq";
import { IMQMessage } from "../model/validation/mqMessage";

import * as logger from "../utils/logger";
import * as formatter from "../utils/formatter";

import { ValidationError } from "../errors/validationError";
import { LogicalError } from "../errors/logicalError";

import { IPassenger } from "../model/passenger";
import { IAirplane } from "../model/airplane";
import * as airplanePool from "../airPlanePool";

import * as passengersAPI from "../webapi/passengersAPI";

import * as helper from "../utils/loadHelper";
import { IUnloadPassengersReq, validateUnloadPasReq } from "../model/validation/passengersReq";

//#endregion

export async function unloadPassengers(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got MQ request to unload passengers");

  let unloadReq: IUnloadPassengersReq = validateUnloadPasReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.get(unloadReq.airplaneId);

  updateStatusBefore(unloadReq, airplane);
  let passengers: IPassenger[] = await unload(unloadReq, airplane);
  updateStatusAfter(unloadReq, airplane, passengers);

  notifyAboutEnd(unloadReq, passengers, mqMessage);
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

//#region update status

function updateStatusBefore(unloadReq: IUnloadPassengersReq, airplane: IAirplane): void {
  if (airplane.passengers.length === 0) {
    throw new LogicalError("Can not unload passengers from " + formatter.airplane(airplane) + " because it is empty");
  }

  helper.startUnloading(airplane, helper.LoadTarget.Passengers, unloadReq.busId);
  logger.log(formatter.airplane(airplane) + " is unloading passengers to " + unloadReq.busId);
}

function updateStatusAfter(unloadReq: IUnloadPassengersReq, airplane: IAirplane, passengers: IPassenger[]): void {
  helper.endUnloading(airplane, helper.LoadTarget.Passengers, unloadReq.busId);

  logger.log(`Unloaded ${passengers.length} passengers from ${formatter.airplane(airplane)} to ${unloadReq.busId}. ` +
              `${airplane.passengers.length} left`);
  helper.checkUnloadEnd(airplane);
}

//#endregion

async function changePassengersStatus(unloadReq: IUnloadPassengersReq, passengers: IPassenger[]): Promise<void> {
  let newStatus: string = "LandingFromAirplaneToBus";
  let transportId: string = unloadReq.busId;
  let passengersIds: Guid[] = passengers.map(p => p.id);

  await passengersAPI.changeStatus(newStatus, transportId, passengersIds).catch(e => logger.error(
    `Error notifying passengers about unload airplane: ${formatter.guid(unloadReq.airplaneId)}. ` + e.toString()));
}

function notifyAboutEnd(unloadReq: IUnloadPassengersReq, passengers: IPassenger[], mqMessage: IMQMessage): void {
  if (!mqMessage.properties.replyTo) {
    logger.error("Missing 'replyTo' in unload passengers request");
    return;
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
    Transport: "Bus|" + unloadReq.busId,
    Duration: duration,
  };

  mq.send(body, mq.visualizerMQ);
}