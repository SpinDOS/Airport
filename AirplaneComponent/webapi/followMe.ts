import Router, { IRouterContext } from "koa-router";
import * as airplanePool from "../airPlanePool";
import { Guid } from "guid-typescript";
import { IAirplane } from "../model/airplane";
import * as assert from "../utils/assert";
import HttpStatus from "http-status-codes";
import { ValidationError } from "../errors/validationError";
import { FollowMeStart, FollowMeEnd } from "../model/validation/followMe";


const prefix: string = "/:airplane/followMe/";
export function register(router: Router): void {
  router.post(prefix + "start", startFollowing);
  router.post(prefix + "end", endFollowing);
}

function startFollowing(ctx: IRouterContext): void {
  let param: FollowMeStart = FollowMeStart.validate(ctx.request.body);

  let airplane: IAirplane = ctx.airplane;
  assert.AreEqual(AirplaneStatus.WaitingForLanding, airplane.status.type);
  airplane.status = {
    type: AirplaneStatus.Following,
    additionalInfo: { carId: param.carId } ,
  };

  ctx.response.status = HttpStatus.OK;
}

function endFollowing(ctx: IRouterContext): void {
  let param: FollowMeEnd = FollowMeEnd.validate(ctx.request.body);

  let airplane: IAirplane = ctx.airplane;
  assert.AreEqual(AirplaneStatus.Following, airplane.status.type);

  airplane.status = {
    type: AirplaneStatus.OnParking,
    additionalInfo: { parkingId: param.parkingId },
  };

  ctx.response.status = HttpStatus.OK;
}

