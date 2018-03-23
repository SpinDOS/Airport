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

import * as followMe from "./followMe";
import * as info from "./info";


// const host: string = "10.99.10.10";
const host: string = "localhost";
const port: number = 8081;

let app: Koa = new Koa();

export function start(): void {
  let router: Router = new Router();
  setUpRouter(router);

  app.use(handleErrors);
  app.use(configureBodyParser());
  app.use(router.routes());

  app.listen(port, host);
  logger.log(`Http server is listening on http://${host}:${port}/`);
}

async function handleErrors(ctx: Koa.Context, next: () => Promise<any>): Promise<any> {
  await next().catch(err => {
    if (!(err instanceof BaseError)) {
      throw err;
    }

    ctx.response.status = getStatusCode(err);

    let req: any = ctx.request;
    let sourceText: string = (req && req.body && req.body.toString()) || ctx.request.url;

    logger.error(formatter.error(err, sourceText));
  });
}

function setUpRouter(router: Router): void {
  info.register(router);

  let routerWithAirplane: Router = router.param("airplane", validateAirplaneId);
  followMe.register(routerWithAirplane);

  router.get("/*", async (ctx) => {
    ctx.body = "Hello World!";
  });
}

function validateAirplaneId(id: string, ctx: IRouterContext, next: () => Promise<any>): Promise<any> {
  if (!id || !Guid.isGuid(id)) {
    throw new ValidationError("Http request: Invalid airplane id: " + id);
  }

  ctx.airplane = airplanePool.get(Guid.parse(id));
  return next();
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

function configureBodyParser(): Middleware<Koa.Context> {

  function onError(err: Error, ctx: Koa.Context): void {
    let message: string = (err as any).body || err.message || err.toString();
    throw new ValidationError("Http request body parse error: " + message);
  }

  let opts: any = {
    onerror: onError
  };

  return bodyParser(opts);
}