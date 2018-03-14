import "reflect-metadata";
import * as logger from "./utils/logger";
import * as mqListen from "./mq/mqListen";
import { Flight } from "./model/validation/Flight";

mqListen.start();
logger.log("Working");
