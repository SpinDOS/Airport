import Koa from "koa";
import Router, { IRouterContext, IParamMiddleware } from "koa-router";
import { Middleware } from "koa-compose";
import { Guid } from "guid-typescript";
import bodyParser from "koa-bodyparser";
import * as logger from "../utils/logger";
import * as formatter from "../utils/modelFormatter";
import * as followMe from "./followMe";
import * as airplanePool from "../airPlanePool";
import * as HttpStatus from "http-status-codes";
import { IAirplane } from "../model/airplane";
import { LogicalError } from "../errors/logicalError";
import { ValidationError } from "../errors/validationError";
import { NotFoundError } from "../errors/notFoundError";

const port: number = 8081;
const app: Koa = new Koa();

export function start(): void {
  let router: Router = new Router();
  setUpRouter(router);

  app.use(handleErrors);
  app.use(bodyParser());
  app.use(router.routes());

  app.listen(8081);
  logger.log(`Http server is listening on http://localhost:${port}/`);
}

async function handleErrors(ctx: Koa.Context, next: () => Promise<any>): Promise<any> {
  next().catch(err => {
    const invalidCode: number = -0.5;
    let statusCode: number = invalidCode;

    if (err instanceof LogicalError || err instanceof ValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
    } else if (err instanceof NotFoundError) {
      statusCode = HttpStatus.NOT_FOUND;
    }

    if (statusCode === invalidCode) {
      throw err;
    }

    ctx.response.status = statusCode;

    let req: any = ctx.request;
    let sourceText: string = (req && req.body && req.body.toString()) || ctx.request.url;
    logger.error(formatter.error(err, sourceText));
  });
}

function setUpRouter(router: Router): void {
  let routerWithAirplane: Router = router.param("airplane", validateAirplaneId);
  followMe.register(routerWithAirplane);

  router.get("/*", async (ctx) => {
    ctx.body = "Hello World!";
  });
}

function validateAirplaneId(id: string, ctx: IRouterContext, next: () => Promise<any>): any {
  if (!Guid.isGuid(id)) {
    throw new ValidationError({message: "Invalid airplane id format"});
  }

  ctx.airplane = airplanePool.tryGet(Guid.parse(id));
  if (!ctx.airplane) {
    throw new NotFoundError(id, "Can not find airplane with id: " + id);
  }

  return next();
}