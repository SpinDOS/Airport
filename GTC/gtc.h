#ifndef GTC_H
#define GTC_H

#include <QDebug>
#include <QHash>

#include "airplain.h"
#include "env.h"
#include "amqp_sender.h"
#include "logger.h"
#include "traffic_control.h"

class GtcLogic {
	enum class ProcessStatus {
		Ack,
		Nack,
		Retry,
		Error
	};

	Logger _log {"Gtc"};
	Environment _env;
	AmqpSender  _sender;
	TrafficControl _router;

	QHash<QString, Airplain> _airplains;

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

	ProcessStatus processMovementRequest(const QJsonDocument &doc, const amqp_basic_properties_t *prop);
	ProcessStatus processAcceptRequest(const QJsonDocument &doc);
	ProcessStatus processMaintainRequest(const QJsonDocument &doc);

public:
	GtcLogic();

	qint32 init(const QString &configPath);
	qint32 open();
	qint32 process();

	void close();
	void destroy();
};


#endif // GTC_H
