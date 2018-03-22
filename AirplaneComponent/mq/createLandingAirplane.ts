import { IAirplaneCreateReq, validateAirplaneCreateReq, IFLightReq } from "../model/validation/airplaneCreateReq";
import { generateRandomModel, IAirplaneModel } from "../model/airplaneModel";
import { Guid } from "guid-typescript";
import { IAirplane } from "../model/airplane";
import { IPassenger } from "../model/passenger";
import { IBaggage } from "../model/baggage";
import * as logger from "../utils/logger";
import * as airplanePool from "../airPlanePool";
import * as mq from "../mq/mq";
import { Message } from "amqp-ts";
import * as formatter from "../utils/formatter";
import { IMQMessage } from "../model/validation/mqMessage";
import * as rp from "request-promise";
import { ConnectionError, onApiError } from "../errors/connectionError";
import { IFlight } from "../model/flight";
import { IPassBagCreateRes, validatePasBagCreateResponse } from "../model/validation/passBagCreateRes";
import { isNotEmptyString, strToPOCO } from "../utils/validation";
import { ValidationError } from "../errors/validationError";
import * as assert from "../utils/assert";
import { passengersUrl } from "../webapi/httpServer";

class PasAndBag {
  constructor(public readonly passengers: IPassenger[],
    public readonly baggage: IBaggage[]) { }
}

export async function createAirplane(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got MQ request to create airplane");

  let createReq: IAirplaneCreateReq =  validateAirplaneCreateReq(mqMessage.value);

  let airplaneModel: IAirplaneModel = randomModel(createReq);
  let fuel: number = randomFuel(airplaneModel.maxFuel);

  let airplaneId: Guid = Guid.create();
  let pasAndBag: PasAndBag = await generatePasAndBagFromAPI(airplaneId, createReq.landingFlight);

  let airplane: IAirplane = {
    id: airplaneId,
    model: airplaneModel,

    landingFlight: createLandingFlight(createReq, pasAndBag),
    departureFlight: new LazyFlight(createReq.departureFlight.id, createReq.departureFlight.code),

    fuel: fuel,

    passengers: pasAndBag.passengers,
    baggages: pasAndBag.baggage,

    status: {
      type: AirplaneStatus.WaitingForLanding,
      additionalInfo: { }
    },
  };

  airplanePool.set(airplane);
  sendMQtoLand(airplane);
  logger.log("Created new airplane: " + formatter.airplane(airplane));
}

function randomModel(createReq: IAirplaneCreateReq): IAirplaneModel {
  let passengersCount: number =
    Math.max(createReq.landingFlight.passengersCount, createReq.departureFlight.passengersCount);
  let baggageCount: number = Math.max(
    createReq.landingFlight.passengersCount + createReq.landingFlight.serviceBaggageCount,
    createReq.departureFlight.passengersCount + createReq.departureFlight.serviceBaggageCount);

  return generateRandomModel(passengersCount, baggageCount);
}

function randomFuel(maxFuel: number): number {
  let fuel: number = Math.random() * maxFuel;
  if (fuel > maxFuel * 0.75) {
    fuel /= 2;
  }

  return Math.max(fuel, maxFuel * 0.2);
}

async function generatePasAndBagFromAPI(
  airplaneId: Guid, flightReq: IFLightReq): Promise<PasAndBag> {

  let body: any = {
    flightID: flightReq.id.toString(),
    pas: flightReq.passengersCount,
    serlug: flightReq.serviceBaggageCount,
    arriving: true,
    transportID: airplaneId.toString()
  };

  return rp.post(passengersUrl + "generate_flight", {
    headers: {"content-type": "application/json"},
    body: JSON.stringify(body)
  })
  .catch(onApiError)
  .then(parseResponse);
}

function parseResponse(data: any): PasAndBag {
  data = strToPOCO(data);
  let response: IPassBagCreateRes = validatePasBagCreateResponse(data);

  let passengers: IPassenger[] = response.passengers.map(p => {
    return {
      id: p.id,
      name: p.first_name,
      baggage: p.luggage,
    };
  });

  let baggages: IBaggage[] =
    response.passengers.filter(p => p.luggage !== "None").map(p => p.luggage as Guid)
    .concat(response.service_luggage)
    .map(guid => {
      return { id: guid };
    });

  return new PasAndBag(passengers, baggages);
}

function createLandingFlight(createReq: IAirplaneCreateReq,
  pasAndBag: PasAndBag): IFlight {
  return {
    id: createReq.landingFlight.id,
    code: createReq.landingFlight.code,
    passengersCount: pasAndBag.passengers.length,
    baggageCount: pasAndBag.baggage.length
  };
}

function sendMQtoLand(airplane: IAirplane): void {
  let message: any = {
    service: "follow_me",
    request: "landing",
    aircraftId: airplane.id.toString(),
  };
  mq.send(message, mq.followMeEndpoint);
}

class LazyFlight implements IFlight {
  constructor(public readonly id: Guid, public readonly code: string) { }

  private _initialized: boolean = false;
  private _passengersCount!: number;
  private _baggageCount!: number;

  get passengersCount(): number {
    if (!this._initialized) {
      this.initialize();
    }
    return this._passengersCount;
  }

  get baggageCount(): number {
    if (!this._initialized) {
      this.initialize();
    }
    return this._baggageCount;
  }

  private initialize(): void {
    let result: any = undefined;
    let qs: object = { flight: this.id.toString() };

    rp.get(passengersUrl + "passengers", { qs: qs })
    .catch(onApiError)
    .then(parseResponse)
    .catch(err => result = err || new Error("Unknown error"));

    while (!result) { /* wait */ }

    if (!(result instanceof PasAndBag)) {
      throw result;
    }

    this._passengersCount = result.passengers.length;
    this._baggageCount = result.passengers.length;
    this._initialized = true;
  }
}