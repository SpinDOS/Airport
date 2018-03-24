#include "amqp_sender.h"

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
#include <cstdio>
qint32 AmqpSender::postMovementMsg(const QString &src, const QString &dst,
                                   const QString &svc, const amqp_basic_properties_t *prop)
{
	QJsonObject answer;
	answer["service"] =  svc;
	answer["request"] = _env.MovementRequest;
	answer["from"] = src;
	answer["to"] = dst;

	QJsonDocument doc(answer);
	QByteArray data(doc.toJson(QJsonDocument::Compact));

	_log.info("post movement message to " + svc);
	auto r = publish(prop->reply_to, prop, data);

	return (r == AMQP_STATUS_OK) ? 0 : -1;
}

qint32 AmqpSender::postServiceMsg(Airplain::State state, const QString &airplaneId, const QString &parkingId)
{
	_post_prop.reply_to = _env.queuename;

	QJsonObject request;
	request["airplane_id"] = airplaneId;
	request["request"] = "service";

	qint32 r1 = 0, r2 = 0;
	switch (state) {
	case Airplain::State::Unloading:
		request["service"] = "bus";
		request["action"]  = "unload";
		request["gate_id"] = _env.PassangerGate;
		request["parking_id"] = parkingId + "Bus";

		_log.info("post service (unload) message to bus");
		r1 = publish(amqp_cstring_bytes(_env.busQueue.constData()), &_post_prop,
		             QJsonDocument(request).toJson(QJsonDocument::Compact));

		request["service"] = "baggage";
		request["gate_id"] = _env.BaggageGate;
		request["parking_id"] = parkingId + "Baggage";
		_log.info("post service (unload) message to baggage");
		r2 = publish(amqp_cstring_bytes(_env.bagQueue.constData()), &_post_prop,
		             QJsonDocument(request).toJson(QJsonDocument::Compact));
		break;
	case Airplain::State::Fueling:
		request["service"] = "fuel";
		request["parking_id"] = parkingId + "Fuel";
		_log.info("post service message to fuel");
		r1 = r2 = publish(amqp_cstring_bytes(_env.fuelQueue.constData()), &_post_prop,
		                  QJsonDocument(request).toJson(QJsonDocument::Compact));
		break;
	case Airplain::State::Loading:
		request["service"] = "bus";
		request["action"] = "load";
		request["gate_id"] = _env.PassangerGate;
		request["parking_id"] = parkingId + "Bus";
		_log.info("post service (load) message to bus");
		r1 = publish(amqp_cstring_bytes(_env.busQueue.constData()), &_post_prop,
		             QJsonDocument(request).toJson(QJsonDocument::Compact));
		request["service"] = "baggage";
		request["gate_id"] = _env.BaggageGate;
		request["parking_id"] = parkingId + "Baggage";
		_log.info("post service (load) message to baggage");
		r2 = publish(amqp_cstring_bytes(_env.bagQueue.constData()), &_post_prop,
		             QJsonDocument(request).toJson(QJsonDocument::Compact));
		break;
	case Airplain::State::Departure:
		request["service"] = "follow_me";
		request["parking_id"] = parkingId + "FollowMe";
		_log.info("post service message to follow_me");
		r1 = r2 = publish(amqp_cstring_bytes(_env.followMeQueue.constData()), &_post_prop,
		                  QJsonDocument(request).toJson(QJsonDocument::Compact));
		break;
	default:
		return _log.errorRet(-1, "unknown airplain state");
	}

	return (r1 == AMQP_STATUS_OK && r2 == AMQP_STATUS_OK) ? 0 : -1;
}

qint32 AmqpSender::publish(const amqp_bytes_t &queue, const amqp_basic_properties_t *prop, const QByteArray &msg)
{
	return amqp_basic_publish(_env.connect, 1, amqp_empty_bytes,
	                          queue, 0, 0, prop,
	                          amqp_cstring_bytes(msg.constData()));
}
