#ifndef TRAFFIC_CONTROLLER_H
#define TRAFFIC_CONTROLLER_H

#include <QObject>

#ifdef __cplusplus
extern "C" {
#endif

#include <amqp.h>
#include <amqp_framing.h>
#include <amqp_tcp_socket.h>

#ifdef __cplusplus
}
#endif


class TrafficController : public QObject {

public:
	int relocate();
};


#endif // TRAFFIC_CONTROLLER_H