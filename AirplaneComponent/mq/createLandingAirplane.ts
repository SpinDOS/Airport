const minFuelRatio: number = 0.1;
const maxFuelRatio: number = 0.8;

//#region import

import { Guid } from "guid-typescript";

import { IMQMessage } from "../model/validation/mqMessage";
import * as mq from "../mq/mq";

import * as logger from "../utils/logger";
import * as formatter from "../utils/formatter";
import { onApiError } from "../errors/connectionError";

import { passengersUrl, PasAndBag, parseArrayOfPassengers,
  parseGenerateResponse, post as PassAPIPost } from "../webapi/passengersAPI";

import * as airplanePool from "../airPlanePool";

import { IResponsePassenger } from "../model/validation/passengersAPIRes";

import { generateRandomModel, IAirplaneModel } from "../model/airplaneModel";
import { AirplaneStatus } from "../model/airplaneStatus";
import { IAirplane } from "../model/airplane";
import { IFlight } from "../model/flight";
import { IPassenger } from "../model/passenger";
import { IBaggage } from "../model/baggage";

import { IAirplaneCreateReq, validateAirplaneCreateReq, IFLightReq } from "../model/validation/airplaneCreateReq";
import { LogicalError } from "../errors/logicalError";

//#endregion

export async function createAirplane(mqMessage: IMQMessage): Promise<void> {
  logger.log("Got MQ request to create airplane");

  let createReq: IAirplaneCreateReq =  validateAirplaneCreateReq(mqMessage.value);

  let airplaneModel: IAirplaneModel = randomModel(createReq);
  let fuel: number = randomFuel(airplaneModel.maxFuel);

  let airplaneId: Guid = Guid.create();
  let pasAndBag: PasAndBag = await generatePasAndBagFromAPI(createReq.landingFlight, airplaneId);

  let airplane: IAirplane = {
    id: airplaneId,
    model: airplaneModel,

    landingFlight: createLandingFlight(createReq, pasAndBag),
    departureFlight: new LazyFlight(createReq.departureFlight),

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
  if (fuel > maxFuel * maxFuelRatio) {
    fuel /= 2;
  }

  return Math.max(fuel, maxFuel * minFuelRatio);
}

function generatePasAndBagFromAPI(flightReq: IFLightReq, airplaneId: Guid): Promise<PasAndBag> {
  let body: any = {
    flightID: flightReq.id.toString(),
    pas: flightReq.passengersCount,
    serlug: flightReq.serviceBaggageCount,
    arriving: true,
    transportID: airplaneId.toString()
  };

  return PassAPIPost("generate_flight", body).then(parseGenerateResponse);
}

function sendMQtoLand(airplane: IAirplane): void {
  let message: any = {
    service: "follow_me",
    request: "landing",
    aircraftId: airplane.id.toString(),
  };

  mq.send(message, mq.followMeMQ);
}


function createLandingFlight(createReq: IAirplaneCreateReq, pasAndBag: PasAndBag): IFlight {
  return {
    id: createReq.landingFlight.id,
    code: createReq.landingFlight.code,
    passengersCount: pasAndBag.passengers.length,
    baggageCount: pasAndBag.baggage.length
  };
}

class LazyFlight implements IFlight {
  constructor(flightReq: IFLightReq) {
    this.id = flightReq.id;
    this.code = flightReq.code;
    this._passengersCount = flightReq.passengersCount;
    this._baggageCount = flightReq.serviceBaggageCount;
  }

  private _initialized: boolean = false;
  private _passengersCount: number;
  private _baggageCount: number;

  public readonly id: Guid;
  public readonly code: string;

  get passengersCount(): number {
    this.initialize();
    return this._passengersCount;
  }

  get baggageCount(): number {
    this.initialize();
    return this._baggageCount;
  }

  private initialize(): void {
    if (this._initialized) {
      return;
    }

    let body: string;
    try {
      let request: any = require("sync-request");
      let qs: object = {
        flight: this.id.toString(),
      };
      let response: any = request("GET", passengersUrl + "/passengers", { qs: qs });
      let encoding: string = (response.headers && response.headers["content-encoding"] &&
                              response.headers["content-encoding"].toString()) || "utf8";
      body = response.getBody(encoding);
    } catch (e) {
      onApiError("Passenger API", e);
      throw new Error("Passenger API unknown error"); // never triggered
    }

    let passengers: IResponsePassenger[] = parseArrayOfPassengers(body);
    if (passengers.length > this._passengersCount) {
      throw new LogicalError("Too many passengers generated for departure flight " + formatter.guid(this.id));
    }

    this._passengersCount = passengers.length;
    this._baggageCount += passengers.filter(p => p.luggage !== "None").length;

    this._initialized = true;
  }
}