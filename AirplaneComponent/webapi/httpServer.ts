const hostname: string = "0.0.0.0";
const port: number = 8081;

//#region import

import Koa from "koa";
import Router, { IRouterContext } from "koa-router";
import { Middleware } from "koa-compose";
import { Guid } from "guid-typescript";
import bodyParser from "koa-bodyparser";
import * as HttpStatus from "http-status-codes";

import * as logger from "../utils/logger";
import * as formatter from "../utils/formatter";

import * as airplanePool from "../airPlanePool";

import { BaseError } from "../errors/baseError";
import { ValidationError } from "../errors/validationError";
import { LogicalError } from "../errors/logicalError";
import { NotFoundError } from "../errors/notFoundError";
import { ConnectionError } from "../errors/connectionError";
import { validateGuid } from "../model/validation/helper";

import * as followMe from "./followMe";
import * as info from "./info";
import * as remove from "./remove";

//#endregion

const app: Koa = new Koa();

export function start(): void {
  let router: Router = new Router();
  setUpRouter(router);

  app.use(handleErrors);
  app.use(configureBodyParser());
  app.use(router.routes());

  app.listen(getPort(), hostname);
  logger.log(`Http server is listening on port ${port}: http://localhost:${port}/`);
}

//#region errors

async function handleErrors(ctx: Koa.Context, next: () => Promise<any>): Promise<any> {
  await next().catch(err => {
    if (!(err instanceof BaseError)) {
      throw err;
    }

    let req: any = ctx.request;
    let sourceText: string = req && ((req.body && req.body.toString()) || req.url);

    let error: string = formatter.error(err, sourceText);
    ctx.response.status = getStatusCode(err);
    ctx.response.body = error;
    logger.error(error);
  });
}

function getStatusCode(err: any): number {
  if (err instanceof LogicalError || err instanceof ValidationError) {
    return HttpStatus.BAD_REQUEST;
  } else if (err instanceof NotFoundError) {
    return HttpStatus.NOT_FOUND;
  } else if (err instanceof ConnectionError) {
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

//#endregion

function configureBodyParser(): Middleware<Koa.Context> {

  function onError(err: Error, ctx: Koa.Context): void {
    let message: string = (err as any).body || err.message || err.toString();
    throw new ValidationError("Http request body parse error: " + message);
  }

  return bodyParser({ onerror: onError });
}

//#region router

function setUpRouter(router: Router): void {
  info.register(router);

  let routerWithAirplane: Router = router.param("airplane", validateAirplaneId);
  followMe.register(routerWithAirplane);
  remove.register(routerWithAirplane);

  router.get("/", async (ctx) => {
    ctx.response.body = "Hello World!";
    ctx.response.status = HttpStatus.OK;
  });
}

function validateAirplaneId(id: string, ctx: IRouterContext, next: () => Promise<any>): Promise<any> {
  let airplaneId: Guid = validateGuid(id, "Http request: Invalid airplane id");
  ctx.airplane = airplanePool.get(airplaneId);
  return next();
}

//#endregion

function getPort(): number {
  let envPortNumber: number | undefined = undefined;
  let envPortStr: string | undefined = process.env.PORT;
  if (envPortStr) {
    envPortNumber = parseInt(envPortStr);
  }

  return envPortNumber || port;
}