import Router, { IRouterContext } from "koa-router";
import HttpStatus from "http-status-codes";

import { IAirplane } from "../model/airplane";
import * as airplanePool from "../airPlanePool";

import * as logger from "../utils/logger";
import * as formatter from "../utils/formatter";

export function register(router: Router): void {
  router.delete("/:airplane", remove);
}

function remove(ctx: IRouterContext): void {
  let airplane: IAirplane = ctx.airplane;
  airplanePool.remove(airplane.id);

  logger.log("Removed " + formatter.airplane(airplane));
  ctx.response.status = HttpStatus.OK;
}