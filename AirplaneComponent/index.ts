import "reflect-metadata";
import { start as startMQListen} from "./mq/mqListen";
import { start as startHttpServer } from "./webapi/httpServer";

startHttpServer();
startMQListen();