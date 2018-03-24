#include "gtc.h"

#include <QFile>
#include <QJsonObject>
#include <QJsonDocument>

#include <cstdio>
#include <cstring>

GtcLogic::GtcLogic()
	: _sender(_env), _router(_env)
{}

qint32 GtcLogic::checkConnection()
{
	_status = amqp_get_rpc_reply(_env.connect);
	if (_status.reply_type != AMQP_RESPONSE_NORMAL)
		return _log.errorRet(-1, amqp_error_string(_status.reply_type));

	return 0;
}

qint32 GtcLogic::checkResponse(amqp_response_type_enum replyType)
{
	switch (replyType) {
	case AMQP_RESPONSE_NONE:
		return _log.errorRet(EAGAIN, "got EOF from socket");
	case AMQP_RESPONSE_LIBRARY_EXCEPTION:
		return _log.errorRet(EAGAIN, "unknown library exception");
	case AMQP_RESPONSE_SERVER_EXCEPTION:
		return _log.errorRet(EAGAIN, "server exception");
	default:
		break;
	}

	return 0;
}

qint32 GtcLogic::init(const QString &configPath)
{
	_log.info("init Gtc Logic");

	QString jsonString;
	QFile file;

	file.setFileName(configPath);
	if (!file.open(QIODevice::ReadOnly | QIODevice::Text))
		return _log.errorRet(EINVAL, "config file not exist");

	_log.info("read config file: " + configPath);
	jsonString = file.readAll();
	file.close();

	auto doc = QJsonDocument::fromJson(jsonString.toUtf8());
	auto json = doc.object();
	const auto &value = json.value("credits");

	if (value.isUndefined())
		return _log.errorRet(EINVAL, "credits json value not found");

	_log.info("read json config");
	if (auto r = readJsonConfig(value.toObject()))
		return r;

	_env.connect = amqp_new_connection();
	if (!_env.connect)
		return _log.errorRet(EINVAL, "fail create new connection");

	if (auto r = _router.init())
		return _log.errorRet(r, "fail init router");

	return 0;
}

qint32 GtcLogic::readJsonConfig(const QJsonObject &data)
{
	if (auto r = readHostData(data))
		return r;

	if (auto r = readLogicSettings(data))
		return r;

	if (auto r = readClientData(data))
		return r;

	return 0;
}

qint32 GtcLogic::readHostData(const QJsonObject &data)
{
	const auto &hostnameObj = data["hostname"];
	const auto &vhostObj    = data["vhost"];
	const auto &userObj     = data["username"];
	const auto &passwdObj   = data["password"];

	if (hostnameObj.isUndefined() || vhostObj.isUndefined() ||
	        passwdObj.isUndefined() || userObj.isUndefined())
		return _log.errorRet(EINVAL, "some login credits are missing");

	const auto &portObj = data["port"];
	if (portObj.isUndefined())
		return _log.errorRet(EINVAL, "port not found");

	_hostname = hostnameObj.toString();
	_vhost    = vhostObj.toString();
	_password = passwdObj.toString();
	_username = userObj.toString();
	_port     = portObj.toInt();

	return 0;
}

qint32 GtcLogic::readLogicSettings(const QJsonObject &data)
{
	const auto &exchangeObj   = data["exchange"];
	const auto &exchTypeObj   = data["exchangeType"];
	const auto &bindingKeyObj = data["bindingKey"];
	const auto &consumerObj   = data["consumerName"];

	if (exchangeObj.isUndefined() || exchTypeObj.isUndefined() ||
	        bindingKeyObj.isUndefined() || consumerObj.isUndefined())
		return _log.errorRet(EINVAL, "some stream data are missing");

	_exchange     = exchangeObj.toString();
	_exchangeType = exchTypeObj.toString();
	_bindingKey   = bindingKeyObj.toString();
	_consumerName = consumerObj.toString();

	return 0;
}

qint32 GtcLogic::readClientData(const QJsonObject &data)
{
	const auto &busInfo      = data["busQueue"];
	const auto &bagInfo      = data["bagQueue"];
	const auto &fuelInfo     = data["fuelQueue"];
	const auto &followMeInfo = data["followMeQueue"];

	if (busInfo.isUndefined() || bagInfo.isUndefined() ||
	        fuelInfo.isUndefined() || followMeInfo.isUndefined())
		return _log.errorRet(EINVAL, "queues of machine servicies not define");

	_env.busQueue      = busInfo.toString().toUtf8();
	_env.bagQueue      = bagInfo.toString().toUtf8();
	_env.fuelQueue     = fuelInfo.toString().toUtf8();
	_env.followMeQueue = followMeInfo.toString().toUtf8();

	return 0;
}

qint32 GtcLogic::open()
{
	_log.info("open gtc logic");
	const auto &vhost  = _vhost.toStdString();
	const auto &user   = _username.toStdString();
	const auto &passwd = _password.toStdString();

	_log.info("open tcp socket");
	if (auto r = openTcpSocket())
		return r;

	_log.info("login in " + _hostname);
	_status = amqp_login(_env.connect, vhost.c_str(), 200, 131072, 0,
	                     AMQP_SASL_METHOD_PLAIN, user.c_str(), passwd.c_str());
	if (_status.reply_type != AMQP_RESPONSE_NORMAL)
		return _log.errorRet(EAGAIN, amqp_error_string(_status.reply_type));

	_log.info("opening channel");
	amqp_channel_open(_env.connect, 1);
	if (checkConnection())
		return EAGAIN;

	if (auto r = _sender.declareClientQueues())
		return _log.errorRet(r, "fail init sender");

	if (auto r = openMsgQueueStream())
		return r;

	return 0;
}

qint32 GtcLogic::openTcpSocket()
{
	const auto &host = _hostname.toStdString();

	_socket = amqp_tcp_socket_new(_env.connect);
	if (!_socket)
		return _log.errorRet(EAGAIN, "fail create tcp socket");

	if (amqp_socket_open(_socket, host.c_str(), _port))
		return _log.errorRet(EAGAIN, "fail open amqp tcp socket");

	return 0;
}

qint32 GtcLogic::openMsgQueueStream()
{
	const auto &exch     = _exchange.toStdString();
	const auto &exchType = _exchangeType.toStdString();
	const auto &bindKey  = _bindingKey.toStdString();
	const auto &consumer = _consumerName.toStdString();

	_log.info("declaring exchange");
	amqp_exchange_declare(_env.connect, 1, amqp_cstring_bytes(exch.c_str()),
	                      amqp_cstring_bytes(exchType.c_str()), 0, 1, 0, 0, amqp_empty_table);
	if (checkConnection())
		return EAGAIN;

	_log.info("declaring queue");
	auto r = amqp_queue_declare(_env.connect, 1, amqp_cstring_bytes(bindKey.c_str()),
	                            0, 1, 0, 0, amqp_empty_table);
	if (checkConnection())
		return EAGAIN;

	_env.queuename = amqp_bytes_malloc_dup(r->queue);
	if (_env.queuename.bytes == NULL)
		return _log.errorRet(EAGAIN, "out of memory");

	_log.info("bind queue");
	amqp_queue_bind(_env.connect, 1, _env.queuename, amqp_cstring_bytes(exch.c_str()),
	                amqp_cstring_bytes(bindKey.c_str()), amqp_empty_table);
	if (checkConnection())
		return EAGAIN;

	_log.info("create basic consume: " + _consumerName);
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
	if (auto r = checkResponse(_status.reply_type))
		return r;

	QByteArray jsonMsg(static_cast<char *>(envelope.message.body.bytes),
	                   envelope.message.body.len);
	auto doc = QJsonDocument::fromJson(jsonMsg);
	auto requestObj = doc["request"];
	auto request = (!requestObj.isUndefined()) ? requestObj.toString()
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
		_log.info("ack " + _consumerName + " message");
		amqp_basic_ack(_env.connect, 1, envelope.delivery_tag, 0);
		break;
	case ProcessStatus::Retry:
		_log.info("requeue " + request + " message");
		amqp_basic_nack(_env.connect, 1, envelope.delivery_tag, 0, true);
		break;
	case ProcessStatus::Nack:
		_log.warn("bad json data");
		amqp_basic_nack(_env.connect, 1, envelope.delivery_tag, 0, false);
		break;
	case ProcessStatus::Error:
		_log.error("fail to process " + request + " message");
		amqp_basic_nack(_env.connect, 1, envelope.delivery_tag, 0, true);
		break;
	}
	amqp_destroy_envelope(&envelope);

	return (st != ProcessStatus::Error) ? 0 : EAGAIN;
}

void GtcLogic::close()
{
	_log.info("close gtc logic");
	amqp_bytes_free(_env.queuename);
	_env.queuename = {0, NULL};

	amqp_channel_close(_env.connect, 1, AMQP_REPLY_SUCCESS);
	amqp_connection_close(_env.connect, AMQP_REPLY_SUCCESS);
}

void GtcLogic::destroy()
{
	_log.info("destroy gtc logic");
	amqp_destroy_connection(_env.connect);
}

GtcLogic::ProcessStatus
GtcLogic::processMovementRequest(const QJsonDocument &doc, const amqp_basic_properties_t *prop)
{
	const auto &svcObj  = doc["service"];
	const auto &srcObj  = doc["from"];
	const auto &dstObj  = doc["to"];
	const auto &statObj = doc["status"];

	if (svcObj.isUndefined() || srcObj.isUndefined()
	        || dstObj.isUndefined() || statObj.isUndefined())
		return _log.errorRet(ProcessStatus::Nack, "bad movement message format");

	auto svc  = svcObj.toString();
	auto src  = srcObj.toString();
	auto dst  = dstObj.toString();
	auto stat = statObj.toString();

	if (svc.isNull() || src.isNull()
	        || dst.isNull() || stat.isNull())
		return _log.errorRet(ProcessStatus::Nack, "bad json fields type");

	_log.info("got movement message status: " + stat);

	auto answer = doc.object();
	if (stat == _env.NeedMovement) {
		const auto &nextLoc = _router.moveTo(src, dst);
		if (nextLoc.isEmpty())
			return ProcessStatus::Retry;

		answer["to"] = nextLoc;
		if (_sender.postMovementMsg(prop, answer))
			return ProcessStatus::Error;

		_router.lock(src, nextLoc);
	} else if (stat == _env.DoneMovement) {
		_router.unlock(src);
	} else
		return _log.errorRet(ProcessStatus::Nack,
		                     "Unknown movement status. Usage \"status\": \"need|done\"");

	return ProcessStatus::Ack;
}

GtcLogic::ProcessStatus
GtcLogic::processAcceptRequest(const QJsonDocument &doc)
{
	const auto &svcObj      = doc["service"];
	const auto &airplaneObj = doc["airplane_id"];
	const auto &parkingObj  = doc["parking_id"];

	if (svcObj.isUndefined() || airplaneObj.isUndefined() || parkingObj.isUndefined())
		return _log.errorRet(ProcessStatus::Nack, "bad accept message fields");

	auto svc        = svcObj.toString();
	auto airplaneId = airplaneObj.toString();
	auto parkingId  = parkingObj.toString();

	if (svc.isNull() || airplaneId.isNull() || parkingId.isNull())
		return _log.errorRet(ProcessStatus::Nack, "bad accpet message format");

	if (svc != "follow_me")
		return _log.errorRet(ProcessStatus::Nack, "get accept message from" + svc);

	_log.info("got accept message from " + svc + " airplaneId: "
	          + airplaneId + " parkingId: " + parkingId);

	auto &airplain = _airplains[airplaneId];
	airplain.setParkingId(parkingId);

	return nextService(airplain.state(), airplaneId, parkingId);
}

GtcLogic::ProcessStatus
GtcLogic::processMaintainRequest(const QJsonDocument &doc)
{
	const auto &svcObj      = doc["service"];
	const auto &airplaneObj = doc["airplane_id"];
	if (svcObj.isUndefined() || airplaneObj.isUndefined())
		return _log.errorRet(ProcessStatus::Nack, "bad maintain message fields");

	auto svc = svcObj.toString();
	auto airplaneId = airplaneObj.toString();
	if (svc.isNull() || airplaneId.isNull())
		return _log.errorRet(ProcessStatus::Nack, "bad maintain message format");

	auto airplain = _airplains.find(airplaneId);
	if (airplain == _airplains.end())
		return _log.errorRet(ProcessStatus::Nack, "airplane not found");

	_log.info("got maintain message from " + svc + " airplaneId: " + airplaneId);
	Airplain::State current = airplain->state();
	Airplain::State next = airplain->maintain(svc);

	if (next == Airplain::State::Away) {
		_log.info("airplain " + airplaneId + " away");
		_airplains.erase(airplain);
		return ProcessStatus::Ack;
	}

	if (next == current)
		return ProcessStatus::Ack;

	return nextService(next, airplaneId, airplain->getParkingId());
}

GtcLogic::ProcessStatus
GtcLogic::nextService(Airplain::State state, const QString &airplaneId, const QString &parkingId)
{
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
		r1 = _sender.postServiceMsg(amqp_cstring_bytes(_env.busQueue.constData()), request);

		request["service"] = "baggage";
		request["gate_id"] = _env.BaggageGate;
		request["parking_id"] = parkingId + "Baggage";
		r2 = _sender.postServiceMsg(amqp_cstring_bytes(_env.bagQueue.constData()), request);
		break;
	case Airplain::State::Fueling:
		request["service"] = "fuel";
		request["parking_id"] = parkingId + "Fuel";
		r1 = r2 = _sender.postServiceMsg(amqp_cstring_bytes(_env.fuelQueue.constData()), request);
		break;
	case Airplain::State::Loading:
		request["service"] = "bus";
		request["action"] = "load";
		request["gate_id"] = _env.PassangerGate;
		request["parking_id"] = parkingId + "Bus";
		r1 = _sender.postServiceMsg(amqp_cstring_bytes(_env.busQueue.constData()), request);

		request["service"] = "baggage";
		request["gate_id"] = _env.BaggageGate;
		request["parking_id"] = parkingId + "Baggage";
		r2 = _sender.postServiceMsg(amqp_cstring_bytes(_env.bagQueue.constData()), request);
		break;
	case Airplain::State::Departure:
		request["service"] = "follow_me";
		request["parking_id"] = parkingId + "FollowMe";
		r1 = r2 = _sender.postServiceMsg(amqp_cstring_bytes(_env.followMeQueue.constData()), request);
		break;
	default:
		return _log.errorRet(ProcessStatus::Error, "unknown airplain state");
	}

	return (r1 == AMQP_STATUS_OK && r2 == AMQP_STATUS_OK) ? ProcessStatus::Ack
	                                                      : ProcessStatus::Error;
}
