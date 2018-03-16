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

	TrafficController controller;

	QHash<qint32, Airplain> _airplains;

	amqp_socket_t *_socket = NULL;
	amqp_connection_state_t _connect = NULL;
	amqp_bytes_t _queuename = {0, NULL};
	amqp_rpc_reply_t _status;

	qint32 _port;

	QString _hostname, _vhost, _password, _username;
	QString _exchange, _exchangeType;
	QString _bindingKey;
	QString _consumerName;

	qint32 process(const QJsonDocument &doc);

	qint32 readJsonConfig(const QJsonObject &credits);
	qint32 initAmqpConnection();

	qint32 openTcpSocket();
	qint32 openMsgQueueStream();

	qint32 checkConnection();

public:

	qint32 init(const QString &configPath);
	qint32 open();
	qint32 process();

	void close();
	void destroy();
};


#endif // GTC_H
