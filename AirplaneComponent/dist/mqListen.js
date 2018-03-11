"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
Object.defineProperty(exports, "__esModule", { value: true });
var Amqp = __importStar(require("amqp-ts"));
var logger = __importStar(require("./utils/logger"));
var url = 'amqps://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi';
var queueName = 'Airplane';
var connection;
var queue;
function start() {
    connection = new Amqp.Connection(url);
    queue = connection.declareQueue(queueName, { durable: true, autoDelete: false });
    queue.activateConsumer(consumer, { exclusive: true, noAck: false });
    logger.log('Connected to RabbitMQ');
}
exports.start = start;
function consumer(message) {
    try {
        var str = decodeContent(message);
        var req = parseMqRequest(str);
        handleReq(req);
        message.ack();
    }
    catch (e) {
        logger.error(e.message);
    }
}
function decodeContent(message) {
    try {
        return message.content.toString('utf8');
    }
    catch (_a) {
        throw new Error(formatMqError('Invalid encoding'));
    }
}
function parseMqRequest(str) {
    var result;
    try {
        result = JSON.parse(str);
    }
    catch (_a) {
        throw new Error(formatMqError('Invalid JSON: ' + str));
    }
    if (!result) {
        throw new Error(formatMqError('Empty JSON: ' + str));
    }
    if (!isNotEmptyString(result.type)) {
        throw new Error(formatMqError("Message's 'type' must be a not empty string"));
    }
    return result;
}
function handleReq(req) {
    switch (req.type) {
        case 'CreateLandingAirplane':
            break;
        default:
            throw new Error(formatMqError('Invalid type: ' + req.type));
    }
}
function formatMqError(message) { return 'MQ message error: ' + message; }
function isString(str) { return typeof str === 'string' || str instanceof String; }
function isNotEmptyString(str) { return isString(str) && str; }
//# sourceMappingURL=mqListen.js.map