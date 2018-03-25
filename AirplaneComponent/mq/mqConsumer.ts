import * as Amqp from "amqplib";

import * as mq from "./mq";
import { IMQMessage, validateMQMessage } from "../model/validation/mqMessage";
import { ValidationError } from "../errors/validationError";

import * as logger from "../utils/logger";
import * as formatter from "../utils/formatter";

import { createAirplane } from "./createLandingAirplane";
import { loadBaggage } from "./baggageLoader";
import { unloadBaggage } from "./baggageUnloader";
import { landing } from "./landing";
import { refuel } from "./refuel";
import { fly } from "./fly";
import { loadPassengers } from "./passengersLoader";
import { unloadPassengers } from "./passengersUnloader";



export function consumer(message: Amqp.Message | null): void {
  if (!message) {
    return;
  }

  let str: string | undefined = undefined;
  try {
    str = decodeContent(message);
    let obj: object = parse(str);
    let mqMessage: IMQMessage = validateMQMessage(obj);
    mqMessage.properties.correlationId = message.properties.correlationId;
    mqMessage.properties.replyTo = message.properties.replyTo;

    handleReq(mqMessage);
  } catch(e) {
    logger.error(formatter.error(e, str));
  }

  mq.channel.ack(message);
}

function decodeContent(message: Amqp.Message): string {
  try {
    return message.content.toString(message.properties.contentEncoding || "utf8");
  } catch {
    throw new ValidationError("Invalid MQ message encoding");
  }
}

function parse(str: string): object {
  try {
    return JSON.parse(str);
  } catch (e) {
    throw new ValidationError("Invalid MQ message's JSON: " + e.toString());
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