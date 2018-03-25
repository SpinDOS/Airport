#include "sender.h"

AmqpSender::AmqpSender(const Environment &e)
	: _env(e)
{
	_post_prop._flags = AMQP_BASIC_CONTENT_ENCODING_FLAG |
	                    AMQP_BASIC_CONTENT_TYPE_FLAG |
	                    AMQP_BASIC_DELIVERY_MODE_FLAG |
	                    AMQP_BASIC_REPLY_TO_FLAG;

	_post_prop.content_encoding = amqp_cstring_bytes(_env.contentEncoding.constData());
	_post_prop.content_type = amqp_cstring_bytes(_env.contentType.constData());
	_post_prop.delivery_mode = 2;
}

qint32 AmqpSender::declareClientQueues()
{
	_log.info("declaring queue " + QString(_env.busQueue));
	amqp_queue_declare(_env.connect, _env.channel, amqp_cstring_bytes(_env.busQueue.constData()),
	                   0, 1, 0, 0, amqp_empty_table);

	_log.info("declaring queue " + QString(_env.bagQueue));
	amqp_queue_declare(_env.connect, _env.channel, amqp_cstring_bytes(_env.bagQueue.constData()),
	                   0, 1, 0, 0, amqp_empty_table);

	_log.info("declaring queue " + QString(_env.fuelQueue));
	amqp_queue_declare(_env.connect, _env.channel, amqp_cstring_bytes(_env.fuelQueue.constData()),
	                   0, 1, 0, 0, amqp_empty_table);

	_log.info("declaring queue " + QString(_env.followMeQueue));
	amqp_queue_declare(_env.connect, _env.channel, amqp_cstring_bytes(_env.followMeQueue.constData()),
	                   0, 1, 0, 0, amqp_empty_table);

	auto status = amqp_get_rpc_reply(_env.connect);
	if (status.reply_type != AMQP_RESPONSE_NORMAL)
		return _log.errorRet(-1, amqp_error_string(status.reply_type));

	return 0;
}

qint32 AmqpSender::postMovementMsg(const amqp_basic_properties_t *prop, const QJsonObject &request)
{
	QJsonDocument doc(request);
	QByteArray data(doc.toJson(QJsonDocument::Compact));

	_log.info("post movement message to " + doc["service"].toString());
	auto r = publish(prop->reply_to, prop, data);

	return (r == AMQP_STATUS_OK) ? 0 : -1;
}

qint32 AmqpSender::postServiceMsg(const amqp_bytes_t &queue, const QJsonObject &request)
{
	_post_prop.reply_to = _env.queuename;

	const auto &action = request.contains("action") ? request["action"].toString()
	                                                : "default";

	_log.info("post service message to " + request["service"].toString() + " action " + action);

	QJsonDocument doc(request);
	QByteArray data(doc.toJson(QJsonDocument::Compact));

	return publish(queue, &_post_prop, data);
}

qint32 AmqpSender::publish(const amqp_bytes_t &queue, const amqp_basic_properties_t *prop, const QByteArray &msg)
{
	return amqp_basic_publish(_env.connect, _env.channel, amqp_empty_bytes,
	                          queue, 0, 0, prop,
	                          amqp_cstring_bytes(msg.constData()));
}
