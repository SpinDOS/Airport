import * as Amqp from "amqp-ts";

const url: string = "amqps://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi";

export let connection: Amqp.Connection = new Amqp.Connection(url);

export let myQueue: Amqp.Queue = connection.declareQueue("Airplane", { durable: true, autoDelete: false });