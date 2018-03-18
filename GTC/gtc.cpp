#include "gtc.h"

#include <QFile>
#include <QJsonObject>
#include <QJsonDocument>

#include <cstdio>
#include <cstring>

GtcLogic::GtcLogic()
	: _sender(_env)
	{}

GtcLogic::ProcessStatus
GtcLogic::processMovementRequest(const QJsonDocument &doc, const amqp_basic_properties_t *prop)
{
	auto svcObj  = doc["service"];
	auto srcObj  = doc["from"];
	auto dstObj  = doc["to"];
	auto statObj = doc["status"];

	if (svcObj == QJsonValue::Undefined || srcObj == QJsonValue::Undefined
			|| dstObj == QJsonValue::Undefined || statObj == QJsonValue::Undefined) {
		qWarning() << "[WARNING] Bad movement message format";
		return ProcessStatus::Nack;
	}

	auto svc  = svcObj.toString();
	auto src  = srcObj.toString();
	auto dst  = dstObj.toString();
	auto stat = statObj.toString();

	if (svc.isNull() || src.isNull()
			|| dst.isNull() || stat.isNull()) {
		qWarning() << "[WARNING] bad json fields type";
		return ProcessStatus::Nack;
	}

	qDebug() << "[TRACE] got movement message from" << svc
			 << src << "->" << dst << "status:" << stat;

	if (stat == _env.NeedMovement) {
		//auto loc = _controller.nextLocation(src, dst);
		QString loc("testloc");
		if (loc.isNull())
			return ProcessStatus::Retry;
		if (_sender.postMovementMsg(src, loc, svc, prop))
			return ProcessStatus::Error;
		//Блокировать вершину нужно после удачной отправки сообщения
	} else if (stat == _env.DoneMovement) {
		//unlock vertex
	} else {
		qWarning() << "[WARNING] Unknown movement status. Usage \"status\": \"need|done\"";
		return ProcessStatus::Nack;
	}

	return ProcessStatus::Ack;
}

GtcLogic::ProcessStatus
GtcLogic::processAcceptRequest(const QJsonDocument &doc)
{
	auto svcObj     = doc["service"];
	auto flightObj  = doc["flight_id"];
	auto parkingObj = doc["aircraft_id"];

	if (svcObj == QJsonValue::Undefined || flightObj == QJsonValue::Undefined
			|| parkingObj == QJsonValue::Undefined) {
		qWarning() << "[WARNING] bad accept message fields";
		return ProcessStatus::Nack;
	}

	auto svc = svcObj.toString();
	auto flightId = flightObj.toString();
	auto parkingId = parkingObj.toString();

	if (svc.isNull() || flightId.isNull() || parkingId.isNull()) {
		qWarning() << "[WARNING] << bad accpet message format";
		return ProcessStatus::Nack;
	}

	if (svc != "follow_me") {
		qWarning() << "[WARNING] get accept message from" << svc;
		return ProcessStatus::Nack;
	}

	qDebug() << "[TRACE] got accept message from" << svc
			 << "flightId:" << flightId << "aircraft:" << parkingId;

	auto &airplain = _airplains[flightId];
	airplain.parkingId = parkingId;

	if (_sender.postServiceMsg(airplain.state, flightId, parkingId)) {
		qWarning() << "[ERROR] fail to post service message";
		return ProcessStatus::Error;
	}

	return ProcessStatus::Ack;

}

GtcLogic::ProcessStatus
GtcLogic::processMaintainRequest(const QJsonDocument &doc)
{
	auto svcObj = doc["service"];
	auto flightObj = doc["flight_id"];

	if (svcObj == QJsonValue::Undefined || flightObj == QJsonValue::Undefined) {
		qWarning() << "[WARNING] bad maintain message fields";
		return ProcessStatus::Nack;
	}

	auto svc = svcObj.toString();
	auto flightId = flightObj.toString();

	if (svc.isNull() || flightId.isNull()) {
		qWarning() << "[WARNING] bad maintain message format";
		return ProcessStatus::Nack;
	}

	auto airplain = _airplains.find(flightId);
	if (airplain == _airplains.end()) {
		qWarning() << "[WARNING] airplain not found";
		return ProcessStatus::Nack;
	}

	Airplain::State current = airplain->state;
	Airplain::State next;
	switch (current) {
	case Airplain::State::Unloading:
		if (svc == "bus")
			airplain->isBusUnload = true;
		else if (svc == "baggage")
			airplain->isBaggageUnload = true;
		next = airplain->nextState();
		break;
	case Airplain::State::Loading:
		if (svc == "bus")
			airplain->isBusLoad = true;
		else if (svc == "baggage")
			airplain->isBaggageLoad = true;
		next = airplain->nextState();
		break;
	default:
		next = airplain->nextState();
		break;
	}

	if (current == next)
		return ProcessStatus::Ack;

	if (next == Airplain::State::Away) {
		qDebug() << "[INFO] Airplan" << flightId << "away";
		_airplains.erase(airplain);
		return ProcessStatus::Ack;
	}

	if (_sender.postServiceMsg(next, flightId, airplain->parkingId)) {
		qWarning() << "[ERROR] fail post service message";
		return ProcessStatus::Error;
	}

	return ProcessStatus::Ack;
}

qint32 GtcLogic::checkConnection()
{
	_status = amqp_get_rpc_reply(_env.connect);
	if (_status.reply_type != AMQP_RESPONSE_NORMAL) {
		qWarning() << "[ERROR] " << amqp_error_string(_status.reply_type);
		return -1;
	}

	return 0;
}

qint32 GtcLogic::init(const QString &configPath)
{
	qDebug() << "[INFO] init Gtc Logic";
	QString jsonString;
	QFile file;

	file.setFileName(configPath);
	if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
		qWarning() << "[ERROR] config file not exist";
		return EINVAL;
	}

	qDebug() << "[INFO] read config file: " << configPath;
	jsonString = file.readAll();
	file.close();

	auto doc = QJsonDocument::fromJson(jsonString.toUtf8());
	auto json = doc.object();
	auto value = json.value("credits");

	if (value.isUndefined()) {
		qWarning() << "[ERROR] credits json value not found";
		return EINVAL;
	}

	qDebug() << "[INFO] read json config";
	if (auto r = readJsonConfig(value.toObject()))
		return r;

	_env.connect = amqp_new_connection();
	if (!_env.connect) {
		qWarning() << "[ERROR] fail create new connection";
		return EINVAL;
	}

	return 0;
}

qint32 GtcLogic::readJsonConfig(const QJsonObject &credits)
{
	auto hostnameObj = credits["hostname"];
	auto vhostObj = credits["vhost"];
	auto userObj = credits["username"];
	auto passwdObj = credits["password"];
	if (hostnameObj.isUndefined() || vhostObj.isUndefined() ||
			passwdObj.isUndefined() || userObj.isUndefined()) {
		qWarning() << "[ERROR] some login credits are missing";
		return EINVAL;
	}

	auto portObj = credits["port"];
	if (portObj.isUndefined()) {
		qWarning() << "[ERROR] port not found";
		return EINVAL;
	}

	auto exchangeObj = credits["exchange"];
	auto exchTypeObj = credits["exchangeType"];
	auto bindingKeyObj = credits["bindingKey"];
	auto consumerObj = credits["consumerName"];
	if (exchangeObj.isUndefined() || exchTypeObj.isUndefined() ||
			bindingKeyObj.isUndefined() || consumerObj.isUndefined()) {
		qWarning() << "[ERROR] some stream data are missing";
		return EINVAL;
	}

	auto busInfo = credits["busQueue"];
	auto bagInfo = credits["bagQueue"];
	auto fuelInfo = credits["fuelQueue"];
	auto followMeInfo = credits["followMeQueue"];
	if (busInfo.isUndefined() || bagInfo.isUndefined() ||
			fuelInfo.isUndefined() || followMeInfo.isUndefined()) {
		qWarning() << "[ERROR] queues of machine servicies not define";
		return EINVAL;
	}

	_hostname      = hostnameObj.toString();
	_vhost         = vhostObj.toString();
	_password      = passwdObj.toString();
	_username      = userObj.toString();
	_exchange      = exchangeObj.toString();
	_exchangeType  = exchTypeObj.toString();
	_bindingKey    = bindingKeyObj.toString();
	_consumerName  = consumerObj.toString();
	_port          = portObj.toInt();

	_env.busQueue      = busInfo.toString().toUtf8();
	_env.bagQueue      = bagInfo.toString().toUtf8();
	_env.fuelQueue     = fuelInfo.toString().toUtf8();
	_env.followMeQueue = followMeInfo.toString().toUtf8();

	return 0;
}

qint32 GtcLogic::open()
{
	qDebug() << "[INFO] open gtc logic";

	const auto &vhost  = _vhost.toStdString();
	const auto &user   = _username.toStdString();
	const auto &passwd = _password.toStdString();

	qDebug() << "[INFO] open tcp socket";
	if (auto r = openTcpSocket())
		return r;

	qDebug() << "[INFO] login in " << _hostname;
	_status = amqp_login(_env.connect, vhost.c_str(), 200, 131072, 0,
						 AMQP_SASL_METHOD_PLAIN, user.c_str(), passwd.c_str());
	if (_status.reply_type != AMQP_RESPONSE_NORMAL) {
		qWarning() << "[ERROR] " << amqp_error_string(_status.reply_type);
		return EAGAIN;
	}

	qDebug() << "[INFO] opening channel";
	amqp_channel_open(_env.connect, 1);
	if (checkConnection())
		return EAGAIN;

	if (auto r = openMsgQueueStream())
		return r;

	return 0;
}

qint32 GtcLogic::openTcpSocket()
{
	const auto &host   = _hostname.toStdString();

	_socket = amqp_tcp_socket_new(_env.connect);
	if (!_socket) {
		qWarning() << "[ERROR] fail create tcp socket";
		return EAGAIN;
	}

	if (amqp_socket_open(_socket, host.c_str(), _port)) {
		qWarning() << "[ERROR] fail open amqp tcp socket";
		return EAGAIN;
	}

	return 0;
}

qint32 GtcLogic::openMsgQueueStream()
{
	const auto &exch     = _exchange.toStdString();
	const auto &exchType = _exchangeType.toStdString();
	const auto &bindKey  = _bindingKey.toStdString();
	const auto &consumer = _consumerName.toStdString();

	qDebug() << "[INFO] declaring exchange";
	amqp_exchange_declare(_env.connect, 1, amqp_cstring_bytes(exch.c_str()),
						  amqp_cstring_bytes(exchType.c_str()), 0, 1, 0, 0, amqp_empty_table);
	if (checkConnection())
		return EAGAIN;

	qDebug() << "[INFO] declaring queue";
	auto r = amqp_queue_declare(_env.connect, 1, amqp_cstring_bytes(bindKey.c_str()),
								0, 1, 0, 0, amqp_empty_table);
	if (checkConnection())
		return EAGAIN;

	_env.queuename = amqp_bytes_malloc_dup(r->queue);
	if (_env.queuename.bytes == NULL) {
		qWarning() << "[ERROR] out of memory";
		return EAGAIN;
	}

	qDebug() << "[INFO] bind queue";
	amqp_queue_bind(_env.connect, 1, _env.queuename, amqp_cstring_bytes(exch.c_str()),
					amqp_cstring_bytes(bindKey.c_str()), amqp_empty_table);
	if (checkConnection())
		return EAGAIN;

	qDebug() << "[INFO] create basic consume:" << _consumerName;
	amqp_basic_consume(_env.connect, 1, _env.queuename, amqp_cstring_bytes(consumer.c_str()),
					   1, 0, 0, amqp_empty_table);
	if (checkConnection())
		return EAGAIN;

	return 0;
}

qint32 GtcLogic::process()
{
	amqp_envelope_t envelope;
	amqp_maybe_release_buffers(_env.connect);

	_status = amqp_consume_message(_env.connect, &envelope, NULL, 0);
	switch (_status.reply_type) {
	case AMQP_RESPONSE_NONE:
		qWarning() << "[ERROR] got EOF from socket:" << amqp_error_string(_status.reply_type);
		return EAGAIN;
	case AMQP_RESPONSE_LIBRARY_EXCEPTION:
		qWarning() << "[ERROR] unknown library exception";
		return EAGAIN;
	case AMQP_RESPONSE_SERVER_EXCEPTION:
		qWarning() << "[ERROR] server exception:" << amqp_error_string(_status.reply_type);
		return EAGAIN;
	default:
		break;
	}

	char *bytes = static_cast<char *>(envelope.message.body.bytes);
	QByteArray jsonMsg(bytes, envelope.message.body.len);
	auto doc = QJsonDocument::fromJson(jsonMsg);
	auto requestObj = doc["request"];
	auto request = (requestObj != QJsonValue::Undefined) ? requestObj.toString()
														 : QString();

	ProcessStatus st;
	if (request == _env.MovementRequest)
		st = processMovementRequest(doc, &envelope.message.properties);
	else if (request == _env.AcceptRequest)
		st = processAcceptRequest(doc);
	else if (request == _env.MaintainRequest)
		st = processMaintainRequest(doc);
	else
		st = ProcessStatus::Nack;

	switch (st) {
	case ProcessStatus::Ack:
		qDebug() << "[TRACE] ack" << request << "message";
		amqp_basic_ack(_env.connect, 1, envelope.delivery_tag, 0);
		break;
	case ProcessStatus::Retry:
		qDebug() << "[TRACE] requeue" << request << "message";
		amqp_basic_nack(_env.connect, 1, envelope.delivery_tag, 0, true);
		break;
	case ProcessStatus::Nack:
		qWarning() << "[WARNING] bad json data";
		amqp_basic_nack(_env.connect, 1, envelope.delivery_tag, 0, false);
		break;
	case ProcessStatus::Error:
		qWarning() << "[ERROR] fail to process" << request << "message";
		amqp_basic_nack(_env.connect, 1, envelope.delivery_tag, 0, true);
		break;
	}
	amqp_destroy_envelope(&envelope);

	return (st != ProcessStatus::Error) ? 0 : EAGAIN;
}

void GtcLogic::close()
{
	qDebug() << "[INFO] close gtc logic";
	amqp_bytes_free(_env.queuename);
	_env.queuename = {0, NULL};

	amqp_channel_close(_env.connect, 1, AMQP_REPLY_SUCCESS);
	amqp_connection_close(_env.connect, AMQP_REPLY_SUCCESS);
}

void GtcLogic::destroy()
{
	qDebug() << "[INFO] destroy gtc logic";
	amqp_destroy_connection(_env.connect);
}
