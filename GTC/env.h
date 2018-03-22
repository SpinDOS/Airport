#ifndef ENV_H
#define ENV_H

#ifdef __cplusplus
extern "C" {
#endif

#include <amqp.h>
#include <amqp_framing.h>
#include <amqp_tcp_socket.h>

#ifdef __cplusplus
}
#endif

#include <QObject>

struct Environment {

	amqp_connection_state_t connect = NULL;
	amqp_bytes_t queuename = {0, NULL};

	const QString MovementRequest = "movement";
	const QString MaintainRequest = "maintain";
	const QString AcceptRequest   = "accept";
	const QString ServiceRequest  = "service";

	const QString PassangerGate   = "PassengerGate1";

	const QString NeedMovement    = "need";
	const QString DoneMovement    = "done";

	QByteArray busQueue, bagQueue, followMeQueue, fuelQueue;

	const QString graphPath = "config/ways.txt";

	const QByteArray contentType     = "json";
	const QByteArray contentEncoding = "utf8";
};

#endif // ENV_H
