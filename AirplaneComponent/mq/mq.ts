import * as Amqp from "amqplib";
import { consumer } from "./mqConsumer";
import * as logger from "../utils/logger";
import * as formatter from "../utils/formatter";

export let connection: Amqp.Connection;
export let channel: Amqp.Channel;
export let myQueue: Amqp.Replies.AssertQueue;

export const airplaneMQ: string = "Airplane";
export const visualizerMQ: string = "visualizer";
export const followMeMQ: string = "FMMQ";
export const fuelAnswerMQ: string = "refuelerAnswerMQ";

export async function send(data: object, to: string, correlationId?: any ): Promise<void> {
  let options: Amqp.Options.Publish = {
    replyTo: myQueue.queue,
    correlationId: correlationId,
    contentEncoding: "utf8",
    contentType: "application/json",
  };

  let content: Buffer = new Buffer(JSON.stringify(data), options.contentEncoding);
  channel.publish("", to, content, options);
}

export function start(): void {
  startAsync().catch(e => logger.error(formatter.error(e)));
}

async function startAsync(): Promise<void> {
  connection = await Amqp.connect(getConnectonUrl());
  channel = await connection.createChannel();

  await createQueues();

  channel.consume(myQueue.queue, consumer, { exclusive: true, noAck: false });
  logger.log("Connected to RabbitMQ");
}



async function createQueues(): Promise<void> {
  let options: Amqp.Options.AssertQueue = {
    durable: true,
    autoDelete: false,
    exclusive: false,
  };

  myQueue = await channel.assertQueue(airplaneMQ, options);
  await channel.assertQueue(followMeMQ, options);
  await channel.assertQueue(fuelAnswerMQ, options);
  await channel.assertQueue(visualizerMQ, options);
}

function getConnectonUrl(): string {
  // tslint:disable-next-line:no-string-literal
  let url: string | undefined = process.env["mqUrl"];
  if (url) {
    return url;
  }

  throw new Error("Set environment variable 'mqUrl' to RabbitMQ server url");
}