#ifndef AMQP_SENDER_H
#define AMQP_SENDER_H

#include <QDebug>
#include <QJsonObject>
#include <QJsonDocument>

#include "env.h"
#include "airplain.h"
#include "logger.h"

class AmqpSender {
	Logger _log {"Sender  "};

	amqp_basic_properties_t _post_prop;
	const Environment &_env;

	qint32 publish(const amqp_bytes_t &queue, const amqp_basic_properties_t *prop, const QByteArray &msg);

public:
	AmqpSender(const Environment &e);

	qint32 declareClientQueues();

	qint32 postMovementMsg(const amqp_basic_properties_t *prop, const QJsonObject &request);
	qint32 postServiceMsg(const amqp_bytes_t &queue, const QJsonObject &request);
};

#endif // AMQP_SENDER_H
