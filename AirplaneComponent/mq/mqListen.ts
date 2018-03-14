import * as Amqp from "amqp-ts";
import * as logger from "../utils/logger";
import { MQMessage } from "../model/validation/mqMessage";
import { ValidationError } from "../errors/validationError";
import { LogicalError } from "../errors/logicalError";
import { myQueue } from "../mq";
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
    handleError(e, str);
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

function handleError(error: any, sourceText?: string): void {
  const unexpectedError: string = "Unexpected error occured";

  if (!error) {
    logger.error(unexpectedError);
    return;
  }

  if (error instanceof ValidationError) {
    error.sourceText = sourceText;
  }

  logger.error(error.toString() || unexpectedError);
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