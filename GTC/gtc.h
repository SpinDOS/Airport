#ifndef GTC_H
#define GTC_H

#include <QDebug>
#include <QObject>
#include <QHash>

#include "traffic_controller.h"
#include "service.h"

#ifdef __cplusplus
extern "C" {
#endif

#include <amqp.h>
#include <amqp_framing.h>
#include <amqp_tcp_socket.h>

#ifdef __cplusplus
}
#endif

class GtcLogic : public QObject {
	Q_OBJECT

	enum class ProcessStatus {
		Ack,
		Nack,
		Retry,
		Error
	};

	TrafficController _controller;

	QHash<qint32, Airplain> _airplains;

	const QString MovementRequest = "movement";
	const QString MaintainRequest = "maintain";
	const QString AcceptRequest   = "accept";
	const QString ServiceRequest  = "service";

	const QString NeedMovement    = "need";
	const QString DoneMovement    = "done";

	QByteArray _content_encoding;
	QByteArray _content_type;

	amqp_socket_t *_socket = NULL;
	amqp_connection_state_t _connect = NULL;
	amqp_bytes_t _queuename = {0, NULL};
	amqp_rpc_reply_t _status;

	qint32 _port;

	QString _hostname, _vhost, _password, _username;
	QString _exchange, _exchangeType;
	QString _bindingKey;
	QString _consumerName;

	qint32 readJsonConfig(const QJsonObject &credits);

	qint32 openTcpSocket();
	qint32 openMsgQueueStream();

	qint32 checkConnection();

	ProcessStatus processMovementRequest(const QJsonDocument &doc, const amqp_basic_properties_t &prop);
	ProcessStatus processAcceptRequest(const QJsonDocument &doc);
	ProcessStatus processMaintainRequest(const QJsonDocument &doc);

	qint32 postMovementRequest(const QString &src, const QString &dst, const QString &svc,
							   const amqp_bytes_t &corrId, const amqp_bytes_t &replyTo);
	qint32 postServiceRequest();

public:

	qint32 init(const QString &configPath);
	qint32 open();
	qint32 process();

	void close();
	void destroy();
};


#endif // GTC_H
