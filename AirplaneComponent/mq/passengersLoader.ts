import * as mq from "./mq";
import * as logger from "../utils/logger";
import * as airplanePool from "../airPlanePool";
import { IMQMessage } from "../model/validation/mqMessage";
import { ValidationError } from "../errors/validationError";
import { IAirplane } from "../model/airplane";
import { NotFoundError } from "../errors/notFoundError";
import { Guid } from "guid-typescript";
import * as assert from "../utils/assert";
import { Message } from "amqp-ts";
import { delay } from "bluebird";
import * as formatter from "../utils/formatter";
import { LogicalError } from "../errors/logicalError";
import { IUnloadPassengersReq, validateUnloadPasReq,
  ILoadPassengersReq, validateLoadPassengerReq } from "../model/validation/passengersReq";
import { IPassenger } from "../model/passenger";
import { addCar, removeCar, checkUnloadEnd, checkLoadEnd } from "./baggageLoader";
import * as request from "request";
import { IPassBagCreateRes, IResponsePassenger,
  validatePassenger as validatePassengerAPIRes} from "../model/validation/passBagCreateRes";
import * as rp from "request-promise";
import { onApiError } from "../errors/connectionError";
import { strToPOCO } from "../utils/validation";
import { passengersUrl } from "../webapi/httpServer";

export async function unloadPassengers(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got MQ request to unload passengers");

  let unloadReq: IUnloadPassengersReq = validateUnloadPasReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.byLandingFlight(unloadReq.landingFlightId);

  updateStatusBeforeUnload(airplane, unloadReq.busId);
  let passengers: IPassenger[] = await unload(unloadReq, airplane);
  updateStatusAfterUnload(airplane, unloadReq.busId);

  notifyBusAboutUnload(passengers, unloadReq, mqMessage);
  logger.log(`Unloaded ${passengers.length} passengers. ${airplane.passengers.length} left`);
}

async function unload(unloadReq: IUnloadPassengersReq, airplane: IAirplane): Promise<IPassenger[]> {
  let result: IPassenger[] = [];
  for (let i: number = 0; i < Math.min(unloadReq.count, airplane.passengers.length); i++) {
    result.push(airplane.passengers.pop() as IPassenger);
  }

  notifyPassengers(result.map(p => p.id), "unload/start");
  await delay(100 * result.length);
  return result;
}

function updateStatusBeforeUnload(airplane: IAirplane, busId: string): void {
  if (airplane.passengers.length === 0) {
    throw new LogicalError("No passengers found to unload");
  }

  if (airplane.status.type === AirplaneStatus.OnParkingAfterLandingLoaded) {
    airplane.status.type = AirplaneStatus.UnloadingPassengersAndBaggage;
  } else {
    assert.AreEqual(AirplaneStatus.UnloadingPassengersAndBaggage, airplane.status.type);
  }
  addCar(airplane, busId, "buses");
  logger.log(formatter.airplane(airplane) + " is unloading passengers to " + busId);
}

function updateStatusAfterUnload(airplane: IAirplane, busId: string): void {
  logger.log(formatter.airplane(airplane) + " finished unloading passengers to " + busId);
  removeCar(airplane, busId, "buses");
  checkUnloadEnd(airplane);
}

function notifyBusAboutUnload(passengers: IPassenger[], unloadReq: IUnloadPassengersReq,
  mqMessage: IMQMessage): void {
  if (!mqMessage.replyTo) {
    throw new ValidationError("Missing 'replyTo' in unload passengers request");
  }

  let body: any = {
    busId: unloadReq.busId,
    passenger: passengers.map(p => p.id.toString())
  };
  mq.send(body, mq.getQueueOrExchange(mqMessage.replyTo));
}




export async function loadPassengers(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got MQ request to load passengers");

  let loadReq: ILoadPassengersReq = validateLoadPassengerReq(mqMessage.value);
  let airplane: IAirplane = airplanePool.byDepartureFlight(loadReq.departureFlightId);

  updateStatusBeforeLoad(airplane, loadReq.busId);
  await load(loadReq, airplane);
  updateStatusAfterLoad(airplane, loadReq.busId);

  notifyAboutLoadEnd(loadReq, mqMessage);
  logger.log(`Loaded ${loadReq.passengers.length} passengers. ${airplane.passengers.length} total`);
}

async function load(loadReq: ILoadPassengersReq, airplane: IAirplane): Promise<void> {
  let passengers: IPassenger[] = await getPassengersInfoFromAPI(loadReq);
  for (let i: number = 0; i < passengers.length; i++) {
    await delay(100);
    if (airplane.passengers.length === airplane.departureFlight.passengersCount) {
      throw new LogicalError("Too many passengers is beeing loaded");
    }
    airplane.baggages.push(passengers[i]);
  }
}

function updateStatusBeforeLoad(airplane: IAirplane, busId: string): void {
  if (airplane.status.type === AirplaneStatus.OnParkingEmpty) {
    airplane.status.type = AirplaneStatus.LoadingPassengersAndBaggage;
  } else {
    assert.AreEqual(AirplaneStatus.LoadingPassengersAndBaggage, airplane.status.type);
  }
  addCar(airplane, busId, "buses");
  logger.log(formatter.airplane(airplane) + " is loading passengers from " + busId);
}

function updateStatusAfterLoad(airplane: IAirplane, busId: string): void {
  logger.log(formatter.airplane(airplane) + " finished loading baggage from " + busId);
  removeCar(airplane, busId, "buses");
  checkLoadEnd(airplane);
}

function notifyAboutLoadEnd(loadReq: ILoadPassengersReq, mqMessage: IMQMessage): void {
  if (!mqMessage.replyTo) {
    throw new ValidationError("Missing 'replyTo' in load baggage request");
  }

  let body: any = {
    busId: loadReq.busId,
    result: "OK",
  };
  mq.send(body, mq.getQueueOrExchange(mqMessage.replyTo), mqMessage.correlationId);

  notifyPassengers(loadReq.passengers, "load/end");
}

function notifyPassengers(passengers: Guid[], type: "unload/start" | "load/end"): void {
  let body: any = passengers.map(g => g.toString());

  request.post(passengersUrl + load, {
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }, (_, err) => {
    if (err) {
      let humanifyType: string = type.replace("/", " ");
      logger.error(`Error notifying passengers about ${humanifyType} from flight `);
    }
  });
}

async function getPassengersInfoFromAPI(loadReq: ILoadPassengersReq): Promise<IPassenger[]> {
  let resp: IResponsePassenger[] = await getAllPassengersOfFlight(loadReq.departureFlightId);
  return resp
    .filter(p => !!loadReq.passengers.find(pp => pp.equals(p.id)))
    .map(p => { return {
      id: p.id,
      name: p.first_name,
      baggageId: p.luggage === "None"? undefined : p.luggage
    };});
}

export async function getAllPassengersOfFlight(flightId: Guid): Promise<IResponsePassenger[]> {
  return rp.get(passengersUrl + "passengers", {
    headers: { "content-type": "application/json" },
    qs: { flight: flightId.toString() }
  })
  .catch(onApiError)
  .then(function (value: any): IResponsePassenger[] {
    value = strToPOCO(value);
    if (!(value instanceof Array)) {
      throw new ValidationError("Passengers API call for passengers info must contain array");
    }
    return value.map(validatePassengerAPIRes);
  });
}