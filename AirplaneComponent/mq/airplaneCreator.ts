import { transformAndValidateSingle } from "../model/validation/validateWrapper";
import { AirplaneCreateParams } from "../model/validation/airplaneCreateParams";
import { findRandomModel, AirplaneModel } from "../model/airplaneModel";
import { Guid } from "guid-typescript";
import { Airplane } from "../model/airplane";
import { Passenger } from "../model/passenger";
import { Baggage } from "../model/baggage";
import * as logger from "../utils/logger";


export function createAirplane(createParams: any): void {
  let params =  transformAndValidateSingle(AirplaneCreateParams, createParams);

  let airplaneModel = randomModel(params);
  let fuel = randomFuel(airplaneModel.maxFuel);

  let apiCallResult = getPassengersAndBaggageFromAPI(
    params.landingFlight.passengersCount, params.landingFlight.serviceBaggageCount);

  let airplane: Airplane =  {
    id: Guid.create(),
    model: airplaneModel,

    landingFlight: params.landingFlight.toFlight(),
    departureFlight: params.departureFlight.toFlight(),

    fuel: fuel,

    passengers: apiCallResult.passengers,
    baggages: apiCallResult.baggage,

    status: AirplaneStatus.WaitingForLanding,

    toString: function() {
      return `airplane ${this.model.name}(id: ${this.id.toString().toUpperCase()})`;
    }
  }

  logger.log('Created new airplane: ' + airplane.toString());
}

function randomModel(createParams: AirplaneCreateParams): AirplaneModel {
  const baggagePerPassenger = 30;

  let passengersCount = Math.max(createParams.landingFlight.passengersCount, createParams.departureFlight.passengersCount);
  let baggageCount = Math.max(
    createParams.landingFlight.passengersCount * baggagePerPassenger + createParams.landingFlight.serviceBaggageCount, 
    createParams.departureFlight.passengersCount * baggagePerPassenger + createParams.departureFlight.serviceBaggageCount);

  return findRandomModel(passengersCount, baggageCount);;
}

function randomFuel(maxFuel: number): number {
  let fuel = Math.random() * maxFuel;
  if (fuel > maxFuel * 0.75) {
    fuel /= 2;
  }

  return Math.max(fuel, maxFuel * 0.2);
}

function getPassengersAndBaggageFromAPI(passengersCount: number, serviceBaggageCount: number): 
  { passengers: Passenger[], baggage: Baggage[] } {
    return null as any;
  }
