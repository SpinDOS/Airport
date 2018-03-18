import { start as startMQListen} from "./mq/mq";
import { start as startHttpServer } from "./webapi/httpServer";

startHttpServer();
startMQListen();