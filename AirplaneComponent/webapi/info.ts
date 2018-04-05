//#region import

import Router, { IRouterContext } from "koa-router";
import HttpStatus from "http-status-codes";
import { Guid } from "guid-typescript";

import * as logger from "../utils/logger";

import * as airplanePool from "../airPlanePool";

import { IInfoQueryParams, validateInfoQueryParams } from "../model/validation/infoQueryParams";
import { IAirplane } from "../model/airplane";

//#endregion

export function register(router: Router): void {
  router.get("/info", info);
}

function info(ctx: IRouterContext): void {
  logger.log("Got info request");
  let params: IInfoQueryParams = validateInfoQueryParams(ctx.request.query);
  let result: IAirplane[] = airplanesArray().filter(createFilter(params));
  ctx.response.body = JSON.stringify(result.map(format));
  ctx.response.status = HttpStatus.OK;
}

function format(airplane: IAirplane): object {
  return {
    id: airplane.id.toString(),
    landingFlightId: airplane.landingFlight.id.toString(),
    departureFlightId: airplane.departureFlight.id.toString(),
    passengersCount: airplane.passengers.length,
    baggageCount: airplane.baggages.length,
    fuel: airplane.fuel,
    maxFuel: airplane.model.maxFuel,
    maxPassengersCount: airplane.model.maxPassengersCount,
    maxBaggageCount: airplane.model.maxBaggageCount,
    status: airplane.status.type,
    additionalInfo: airplane.status.additionalInfo,
  };
}

function createFilter(params: IInfoQueryParams): (airplane: IAirplane) => boolean {
  return function(airplane: IAirplane): boolean {
    if (params.id && !params.id.equals(airplane.id)) {
      return false;
    } else if (params.landingFlightId && !params.landingFlightId.equals(airplane.landingFlight.id)) {
      return false;
    } else if (params.departureFlightId && !params.departureFlightId.equals(airplane.departureFlight.id)) {
      return false;
    } else if (params.parkingId && params.parkingId !== airplane.status.additionalInfo.parkingId) {
      return false;
    }
    return true;
  };
}

function airplanesArray(): IAirplane[] {
  let result: IAirplane[] = [];
  for (let key in airplanePool.pool) {
    if (airplanePool.pool.hasOwnProperty(key)) {
      result.push(airplanePool.pool[key]);
    }
  }
  return result;
}