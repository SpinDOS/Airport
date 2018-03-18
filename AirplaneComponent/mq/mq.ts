import * as Amqp from "amqp-ts";
import * as logger from "../utils/logger";
import { ValidationError } from "../errors/validationError";
import * as formatter from "../utils/formatter";
import { consumer } from "./mqConsumer";

export type MQEndpoint = Amqp.Queue | Amqp.Exchange;

const url: string = "amqps://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi";
const declareOptions: Amqp.Queue.DeclarationOptions = { durable: true, autoDelete: false };

let connection: Amqp.Connection;
let pool: { [name: string]: MQEndpoint } = { };

export let myQueue: MQEndpoint;
export let visualizerEndpoint: MQEndpoint;
export let followMeEndpoint: MQEndpoint;
export let fuelEndpoint: MQEndpoint;

export function getQueueOrExchange(name: string): MQEndpoint {
  let entry: MQEndpoint | undefined = pool[name];
  if (!entry) {
    pool[name] = entry = connection.declareQueue(name, declareOptions);
  }
  return entry;
}

export function send(data: object, to: MQEndpoint, correlationId?: any): void {
  let message: Amqp.Message = new Amqp.Message(JSON.stringify(data));
  message.properties.correlation_id = correlationId;
  message.sendTo(to);
}

export function start(): void {
  connection = new Amqp.Connection(url);
  fillPool();

  myQueue.activateConsumer(consumer, { exclusive: true, noAck: false });
  logger.log("Connected to RabbitMQ");
}

// tslint:disable:no-string-literal
function fillPool(): void {
  myQueue = connection.declareQueue("Airplane", declareOptions);
  pool[myQueue.name] = myQueue;

  followMeEndpoint = pool["FollowMe"] = pool["FMMQ"] = connection.declareQueue("FMMQ", declareOptions);
  fuelEndpoint = pool["Fuel"] = pool["refuelerMQ"] = connection.declareQueue("refuelerMQ", declareOptions);
  visualizerEndpoint = pool["Visualizer"] = connection.declareQueue("Visualizer", declareOptions);
}
// tslint:enable:no-string-literal