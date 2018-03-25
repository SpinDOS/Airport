const loadSpeed: number = 500;

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
import { ILoadPassengersReq, validateLoadPassengerReq } from "../model/validation/passengersReq";
import { IResponsePassenger } from "../model/validation/passBagCreateRes";



export async function loadPassengers(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got MQ request to load passengers");

  let loadReq: ILoadPassengersReq = validateLoadPassengerReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.get(loadReq.airplaneId);
  let passengers: IPassenger[] = await getPassengersFullInfo(loadReq, airplane);

  updateStatusBeforeLoad(airplane, loadReq);
  await load(loadReq, airplane, passengers);
  await notifyAboutLoadEnd(loadReq, mqMessage);
  updateStatusAfterLoad(airplane, loadReq, passengers);
}

async function load(loadReq: ILoadPassengersReq, airplane: IAirplane, passengers: IPassenger[]): Promise<void> {
  if (passengers.length + airplane.passengers.length > airplane.departureFlight.passengersCount) {
    throw new LogicalError("Too many passengers to load");
  }

  let duration: number = passengers.length * loadSpeed;
  visualizeLoad(loadReq, duration);

  for (let pas of passengers) {
    if (airplane.passengers.find(p => p.id.equals(pas.id))) {
      throw new LogicalError("Passenger " + formatter.passenger(pas) + " can not be loaded twice");
    }

    await delay(loadSpeed);
    airplane.passengers.push(pas);
  }
}

function updateStatusBeforeLoad(airplane: IAirplane, loadReq: ILoadPassengersReq): void {
  helper.startLoading(airplane, "buses", loadReq.busId);
  logger.log(formatter.airplane(airplane) + " is loading passengers from " + loadReq.busId);
}

function updateStatusAfterLoad(airplane: IAirplane, loadReq: ILoadPassengersReq, passengers: IPassenger[]): void {
  helper.endLoading(airplane, "buses", loadReq.busId);

  logger.log(`Loaded ${passengers.length} passengers to ${formatter.airplane(airplane)} from ${loadReq.busId}. ` +
              `${airplane.passengers.length}/${airplane.departureFlight.passengersCount} total`);
  helper.checkLoadEnd(airplane);
}

async function notifyAboutLoadEnd(loadReq: ILoadPassengersReq, mqMessage: IMQMessage): Promise<void> {
  let pasBody: object = {
    newStatus: "InAirplane",
    busId: loadReq.busId,
    airplaneId: loadReq.airplaneId.toString(),
    passengers: loadReq.passengers.map(p => p.toString())
  };

  await passengersAPI.post("changeStatus", pasBody);

  if (!mqMessage.properties.replyTo) {
    throw new ValidationError("Missing 'replyTo' in load passengers request");
  }

  let busBody: any = {
    busId: loadReq.busId,
    airplaneId: loadReq.airplaneId.toString(),
    result: "LoadOk",
  };

  mq.send(busBody, mqMessage.properties.replyTo!, mqMessage.properties.correlationId);
}

function visualizeLoad(loadReq: ILoadPassengersReq, duration: number): void {
  let body: any = {
    Type: "animation",
    AnimationType: "passengers",
    Transport: loadReq.busId,
    Duration: duration,
  };

  mq.send(body, mq.visualizerMQ);
}

async function getPassengersFullInfo(loadReq: ILoadPassengersReq, airplane: IAirplane): Promise<IPassenger[]> {
  let qs: object = {
    flight: airplane.departureFlight.id,
  };
  let response: IResponsePassenger[] = await
    passengersAPI.get("passengers", qs)
    .then(passengersAPI.parseArrayOfPassengers);

  let result: IPassenger[] = [];
  for(let id of loadReq.passengers) {
    let repsPas: IResponsePassenger | undefined = response.find(p => p.id.equals(id));
    if (!repsPas) {
      throw new LogicalError("Can not find info for loading passenger " + id.toString());
    }

    result.push(passengersAPI.mapRespPasToPas(repsPas));
  }

  return result;
}