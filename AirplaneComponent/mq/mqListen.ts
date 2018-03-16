import * as Amqp from "amqp-ts";
import * as logger from "../utils/logger";
import { myQueue } from "./mq";
import { MQMessage } from "../model/validation/mqMessage";
import { ValidationError } from "../errors/validationError";
import * as formatter from "../utils/modelFormatter";
import { createAirplane } from "./airplaneCreator";

export function start(): void {
  myQueue.activateConsumer(consumer, { exclusive: true, noAck: false });
  logger.log("Connected to RabbitMQ");
}

function consumer(message: Amqp.Message): void {
  let str: string | undefined = undefined;
  try {
    str = decodeContent(message);
    let mqMes: MQMessage = MQMessage.validate(str);
    handleReq(mqMes);
  } catch(e) {
    logger.error(formatter.error(e, str));
  }

  message.ack();
}

function decodeContent(message: Amqp.Message): string {
  try {
    return message.content.toString("utf8");
  } catch {
    throw new ValidationError({ message: "Invalid MQ message encoding" });
  }
}

function handleReq(mqMessage: MQMessage): void {
  switch (mqMessage.type) {
    case "CreateLandingAirplane":
      createAirplane(mqMessage.value);
      break;

    default:
      throw new ValidationError( { message: "Invalid MQ message type: " + mqMessage.type });
  }
}