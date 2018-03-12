import * as Amqp from "amqp-ts";
import * as logger from "../utils/logger"
import { MQMessage } from "../model/validation/mqMessage";
import { transformAndValidateSingle } from "../model/validation/validateWrapper";

const url = 'amqps://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi';
const queueName = 'Airplane';

let connection: Amqp.Connection;
let queue: Amqp.Queue;

export function start(): void {
  connection = new Amqp.Connection(url);
  queue = connection.declareQueue(queueName, { durable: true, autoDelete: false });
  queue.activateConsumer(consumer, { exclusive: true, noAck: false });
  logger.log('Connected to RabbitMQ');
}

function consumer(message: Amqp.Message): void {
  try {
    let str = decodeContent(message);
    let mqMes = transformAndValidateSingle(MQMessage, str);
    handleReq(mqMes);
  }
  catch(e) {
    logger.error(e.message || e);
  }

  message.ack();
}

function decodeContent(message: Amqp.Message): string {
  try {
    return message.content.toString('utf8');
  }
  catch {
    throw createMQFormatError('Invalid encoding');
  }
}

function handleReq(mqMessage: MQMessage): void {
  switch (mqMessage.type) {
    case 'CreateLandingAirplane':
    
      break;

    default: 
      throw createMQFormatError('Invalid type: ' + mqMessage.type);
  }
}

function createMQFormatError(message: string) {
  return new Error('MQ format error: ' + message);
}
 
