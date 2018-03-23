import * as Amqp from "amqplib";
import { consumer } from "./mqConsumer";
import * as logger from "../utils/logger";

const connectOptions: Amqp.Options.Connect = {
  hostname: "duckbill.rmq.cloudamqp.com",
  username: "aazhpoyi",
  password: "wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK",
  protocol: "amqps",
  vhost: "aazhpoyi",
};

// const connectOptions: Amqp.Options.Connect = {
//   hostname: "10.99.211.105",
//   port: 5672,
//   username: "user",
//   password: "password",
//   protocol: "amqp",
// };

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

export async function start(): Promise<void> {
  connection = await Amqp.connect(connectOptions);
  channel = await connection.createChannel();

  await createQueues();

  channel.consume(myQueue.queue, consumer, { exclusive: true, noAck: false });
  logger.log("Connected to RabbitMQ");
}



async function createQueues(): Promise<void> {
  let options: Amqp.Options.AssertQueue = {
    durable: true,
    autoDelete: false,
    exclusive: true,
  };

  myQueue = await channel.assertQueue(airplaneMQ, options);

  options = {
    durable: true,
    exclusive: false,
  };

  await channel.assertQueue(followMeMQ, options);
  await channel.assertQueue(fuelAnswerMQ, options);
  await channel.assertQueue(visualizerMQ, options);
}