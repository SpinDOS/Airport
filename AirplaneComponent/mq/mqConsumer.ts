//#region import

import * as Amqp from "amqplib";

import * as mq from "./mq";
import { IMQMessage, validateMQMessage } from "../model/validation/mqMessage";

import { ValidationError } from "../errors/validationError";
import { BaseError } from "../errors/baseError";

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

//#endregion

export async function consumer(message: Amqp.Message | null): Promise<void> {
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

    await handleReq(mqMessage);
  } catch(e) {
    if (!(e instanceof BaseError)) {
      mq.channel.reject(message!, false);
      throw e;
    }

    logger.error(formatter.error(e, str));
  }

  mq.channel.ack(message);
}

//#region parse and validation

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

//#endregion

function handleReq(mqMessage: IMQMessage): Promise<void> {
  switch (mqMessage.type.toLowerCase()) {
    case "createlandingairplane":
      return createAirplane(mqMessage);
    case "unloadbaggage":
      return unloadBaggage(mqMessage);
    case "loadbaggage":
      return loadBaggage(mqMessage);
    case "landing":
      return landing(mqMessage);
    case "refuel":
      return refuel(mqMessage);
    case "fly":
      return fly(mqMessage);
    case "loadpassengers":
      return loadPassengers(mqMessage);
    case "unloadpassengers":
      return unloadPassengers(mqMessage);

    default:
      throw new ValidationError("Invalid MQ message type: " + mqMessage.type);
  }
}