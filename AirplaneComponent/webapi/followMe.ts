import Router, { IRouterContext } from "koa-router";
import * as airplanePool from "../airPlanePool";
import { Guid } from "guid-typescript";
import { IAirplane } from "../model/airplane";
import * as assert from "../utils/assert";
import HttpStatus from "http-status-codes";
import { ValidationError } from "../errors/validationError";
import { validateFollowMeStart, validateFollowMeEndToParking, validateFollowMeEndToStrip } from "../model/validation/followMe";
import * as logger from "../utils/logger";
import * as formatter from "../utils/formatter";
import { LogicalError } from "../errors/logicalError";

const prefix: string = "/:airplane/followMe/";
export function register(router: Router): void {
  router.post(prefix + "startToParking", startFollowingToParking);
  router.post(prefix + "endToParking", endFollowingToParking);
  router.post(prefix + "startToStrip", startFollowingToStrip);
  router.post(prefix + "endToStrip", endFollowingToStrip);
}

function startFollowingToParking(ctx: IRouterContext): void {
  logger.log("Got request to start following Follow-Me to parking");

  let carId: string = validateFollowMeStart(ctx.request.body).carId;
  let airplane: IAirplane = ctx.airplane;

  assert.AreEqual(AirplaneStatus.WaitingForFollowMe, airplane.status.type);
  airplane.status.type = AirplaneStatus.FollowingAfterLanding;
  airplane.status.additionalInfo.followMeCarId = carId;
  delete airplane.status.additionalInfo.stripId;
  logger.log(formatter.airplane(airplane) + ` started following Follow-me '${carId}' to parking`);

  ctx.response.status = HttpStatus.OK;
}

function endFollowingToParking(ctx: IRouterContext): void {
  logger.log("Got request to finish following Follow-Me to parking");

  let parkingId: string = validateFollowMeEndToParking(ctx.request.body).parkingId;
  let airplane: IAirplane = ctx.airplane;

  airplane.status.type =
    airplane.passengers.length > 0 || airplane.baggages.length > 0
    ? AirplaneStatus.OnParkingAfterLandingLoaded
    : airplane.status.type = AirplaneStatus.OnParkingEmpty;

  airplane.status.additionalInfo.parkingId = parkingId;
  delete airplane.status.additionalInfo.followMeCarId;
  logger.log(formatter.airplane(airplane) + ` has arrived to parking '${parkingId}'`);

  ctx.response.status = HttpStatus.OK;
}




function startFollowingToStrip(ctx: IRouterContext): void {
  logger.log("Got request to start following Follow-Me to strip");

  let carId: string = validateFollowMeStart(ctx.request.body).carId;
  let airplane: IAirplane = ctx.airplane;

  if (airplane.status.type !== AirplaneStatus.OnParkingEmpty &&
      airplane.status.type !== AirplaneStatus.OnParkingBeforeDepartureLoaded) {
        throw new LogicalError(formatter.airplane(airplane) + " is not ready for departure");
  }

  if (airplane.passengers.length !== airplane.departureFlight.passengersCount ||
      airplane.baggages.length !== airplane.departureFlight.baggageCount) {
        throw new LogicalError(formatter.airplane(airplane) + " is not loaded for departure");
  }

  if (airplane.fuel < airplane.model.maxFuel * 0.75) {
    throw new LogicalError(formatter.airplane(airplane) + " is not fuelled enough");
  }

  airplane.status.type = AirplaneStatus.FollowingToStrip;
  airplane.status.additionalInfo.followMeCarId = carId;
  delete airplane.status.additionalInfo.parkingId;
  logger.log(formatter.airplane(airplane) + ` started following Follow-me '${carId}' to strip`);

  ctx.response.status = HttpStatus.OK;
}

function endFollowingToStrip(ctx: IRouterContext): void {
  logger.log("Got request to finish following Follow-Me to strip");

  let stripId: string = validateFollowMeEndToStrip(ctx.request.body).stripId;
  let airplane: IAirplane = ctx.airplane;

  assert.AreEqual(AirplaneStatus.FollowingToStrip, airplane.status.type);
  airplane.status.type = AirplaneStatus.PreparingToDeparture;
  airplane.status.additionalInfo.stripId = stripId;
  delete airplane.status.additionalInfo.followMeCarId;
  logger.log(formatter.airplane(airplane) + ` is preparing to departure at strip '${stripId}'`);

  ctx.response.status = HttpStatus.OK;
}



