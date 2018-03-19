import * as Amqp from "amqp-ts";
import { IMQMessage, validateMQMessage } from "../model/validation/mqMessage";
import * as logger from "../utils/logger";
import * as formatter from "../utils/formatter";
import { ValidationError } from "../errors/validationError";
import { createAirplane } from "./createLandingAirplane";
import { unloadBaggage, loadBaggage } from "./baggageLoader";
import { landing } from "./landing";
import { refuel } from "./refuel";
import { fly } from "./fly";
import { loadPassengers, unloadPassengers } from "./passengersLoader";

export function consumer(message: Amqp.Message): void {
  let str: string | undefined = undefined;
  try {
    str = decodeContent(message);
    let obj: object = JSON.parse(str);
    let mqMessage: IMQMessage = validateMQMessage(obj);
    mqMessage.correlationId = message.properties.correlation_id;
    mqMessage.replyTo = message.properties.reply_to;

    handleReq(mqMessage);
  } catch(e) {
    logger.error(formatter.error(e, str));
  }

  message.ack();
}

function decodeContent(message: Amqp.Message): string {
  try {
    return message.content.toString("utf8");
  } catch {
    throw new ValidationError("Invalid MQ message encoding");
  }
}

function handleReq(mqMessage: IMQMessage): void {
  switch (mqMessage.type.toLowerCase()) {
    case "createlandingairplane":
      createAirplane(mqMessage);
      break;
    case "unloadbaggage":
      unloadBaggage(mqMessage);
      break;
    case "loadbaggage":
      loadBaggage(mqMessage);
      break;
    case "landing":
      landing(mqMessage);
      break;
    case "refuel":
      refuel(mqMessage);
      break;
    case "fly":
      fly(mqMessage);
      break;
    case "loadpassengers":
      loadPassengers(mqMessage);
      break;
    case "unloadpassengers":
      unloadPassengers(mqMessage);
      break;

    default:
      throw new ValidationError("Invalid MQ message type: " + mqMessage.type);
  }
}