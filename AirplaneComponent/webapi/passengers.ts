import Router, { IRouterContext } from "koa-router";
import { Guid } from "guid-typescript";
import { ValidationError } from "../errors/validationError";
import { IAirplane } from "../model/airplane";
import * as airPlanePool from "../airPlanePool";

const prefix: string = "/passengers/";

export function register(router: Router): void {
  router.get(prefix + "count", count);
}

function count(ctx: IRouterContext): void {
  let id: string = ctx.request.query.airplaneId;
  if (!id || !Guid.isGuid(id)) {
    throw new ValidationError({message: `Invalid airplane id: ${id}`});
  }

  let airplane: IAirplane = airPlanePool.get(Guid.parse(id));
  ctx.response.body = JSON.stringify({ count: airplane.passengers.length });
}