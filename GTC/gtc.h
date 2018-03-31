#ifndef GTC_H
#define GTC_H

#include <QDebug>
#include <QQueue>
#include <QHash>

#include "airplain.h"
#include "env.h"
#include "sender.h"
#include "logger.h"
#include "traffic_control.h"

class GtcLogic {
	enum class ProcessStatus {
		Ack,
		Nack,
		Retry,
		Error
	};

	Logger _log {"GtcLogic"};
	Environment _env;
	AmqpSender  _sender;
	TrafficControl _router;

	QHash<QString, Airplain> _airplains;
	QQueue<amqp_envelope_t> _messages;

	amqp_socket_t *_socket = NULL;
	amqp_rpc_reply_t _status;

	qint32 _port;

	QString _hostname, _vhost, _password, _username;
	QString _exchange, _exchangeType;
	QString _bindingKey;
	QString _consumerName;

	qint32 readJsonConfig(const QJsonObject &data);
	qint32 readHostData(const QJsonObject &data);
	qint32 readLogicSettings(const QJsonObject &data);
	qint32 readClientData(const QJsonObject &data);

	qint32 openTcpSocket();
	qint32 openMsgQueueStream();

	qint32 checkConnection();
	qint32 checkResponse(amqp_response_type_enum replyType);

	ProcessStatus process(amqp_envelope_t &envelope);

	ProcessStatus processMovementRequest(const QJsonDocument &doc, const amqp_basic_properties_t *prop);
	ProcessStatus processAcceptRequest(const QJsonDocument &doc);
	ProcessStatus processMaintainRequest(const QJsonDocument &doc);

	ProcessStatus nextService(Airplain::State state, const QString &airplaneId, const QString &parkingId);
public:
	GtcLogic();

	qint32 init(const QString &configPath);
	qint32 open();
	qint32 consume();

	void close();
	void destroy();
};


#endif // GTC_H
