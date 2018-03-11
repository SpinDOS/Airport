import * as Amqp from "amqp-ts";
import * as logger from "./utils/logger"

const url = 'amqps://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi';
const queueName = 'Airplane';

let connection: Amqp.Connection;
let queue: Amqp.Queue;

export interface MqRequest {
  type: string,
  value: any,
}

export function start(): void {
  connection = new Amqp.Connection(url);
  queue = connection.declareQueue(queueName, { durable: true, autoDelete: false });
  queue.activateConsumer(consumer, { exclusive: true, noAck: false });
  logger.log('Connected to RabbitMQ');
}

function consumer(message: Amqp.Message): void {
  try {
    let str = decodeContent(message);
    let req = parseMqRequest(str);
    handleReq(req);
    message.ack();
  }
  catch(e) {
    logger.error(e.message);
  }
}

function decodeContent(message: Amqp.Message): string {
  try {
    return message.content.toString('utf8');
  }
  catch {
    throw new Error(formatMqError('Invalid encoding'));
  }
}

function parseMqRequest(str: string): MqRequest {
  let result: any;
  try {
    result = JSON.parse(str);
  }
  catch {
    throw new Error(formatMqError('Invalid JSON: ' + str));
  }

  if (!result) {
    throw new Error(formatMqError('Empty JSON: ' + str));
  }

  if (!isNotEmptyString(result.type)) {
    throw new Error(formatMqError("Message's 'type' must be a not empty string"))
  }

  return result;
}


function handleReq(req: MqRequest): void {
  switch (req.type) {
    case 'CreateLandingAirplane':
    
      break;

    default: 
      throw new Error(formatMqError('Invalid type: ' + req.type));
  }
}

function formatMqError(message: string) { return 'MQ message error: ' + message; }

function isString(str: any) { return typeof str === 'string' || str instanceof String; }
function isNotEmptyString(str: any) { return isString(str) && str; }
 
