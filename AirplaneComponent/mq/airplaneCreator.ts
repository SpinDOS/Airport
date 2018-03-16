import { AirplaneCreateParams } from "../model/validation/airplaneCreateParams";
import { findRandomModel, IAirplaneModel } from "../model/airplaneModel";
import { Guid } from "guid-typescript";
import { IAirplane } from "../model/airplane";
import { IPassenger } from "../model/passenger";
import { IBaggage } from "../model/baggage";
import * as logger from "../utils/logger";
import * as airplanePool from "../airPlanePool";
import * as mq from "../mq/mq";
import { Message } from "amqp-ts";


export function createAirplane(createParams: any): void {
  logger.log("Got MQ request to create airplane");

  let params: AirplaneCreateParams =  AirplaneCreateParams.validate(createParams);

  let airplaneModel: IAirplaneModel = randomModel(params);
  let fuel: number = randomFuel(airplaneModel.maxFuel);

  let apiCallResult: { passengers: IPassenger[]; baggage: IBaggage[]; } =
    getPassengersAndBaggageFromAPI(params.landingFlight.passengersCount, params.landingFlight.serviceBaggageCount);

  let airplane: IAirplane =  {
    id: Guid.create(),
    model: airplaneModel,

    landingFlight: params.landingFlight.toFlight(),
    departureFlight: params.departureFlight.toFlight(),

    fuel: fuel,

    passengers: apiCallResult.passengers,
    baggages: apiCallResult.baggage,

    status: {
      type: AirplaneStatus.WaitingForLanding,
    },
  };

  airplanePool.set(airplane);
  sendMQtoLand(airplane);
  logger.log("Created new airplane: " + airplane.toString());
}

function randomModel(createParams: AirplaneCreateParams): IAirplaneModel {
  const baggagePerPassenger: number = 30;

  let passengersCount: number =
    Math.max(createParams.landingFlight.passengersCount, createParams.departureFlight.passengersCount);
  let baggageCount: number = Math.max(
    createParams.landingFlight.passengersCount * baggagePerPassenger + createParams.landingFlight.serviceBaggageCount,
    createParams.departureFlight.passengersCount * baggagePerPassenger + createParams.departureFlight.serviceBaggageCount);

  return findRandomModel(passengersCount, baggageCount);
}

function randomFuel(maxFuel: number): number {
  let fuel: number = Math.random() * maxFuel;
  if (fuel > maxFuel * 0.75) {
    fuel /= 2;
  }

  return Math.max(fuel, maxFuel * 0.2);
}

function getPassengersAndBaggageFromAPI(passengersCount: number, serviceBaggageCount: number):
  { passengers: IPassenger[], baggage: IBaggage[] } {

    return null as any;
  }

function sendMQtoLand(airplane: IAirplane): void {
  mq.FollowMeMQ.send(new Message(airplane));
}
