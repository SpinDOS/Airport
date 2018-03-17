#include "gtc.h"

#include <QFile>
#include <QJsonObject>
#include <QJsonDocument>

GtcLogic::ProcessStatus
GtcLogic::processMovementRequest(const QJsonDocument &doc, const amqp_basic_properties_t &prop)
{
	auto svcObj  = doc["service"];
	auto srcObj  = doc["from"];
	auto dstObj  = doc["to"];
	auto statObj = doc["status"];

	if (svcObj == QJsonValue::Undefined || srcObj == QJsonValue::Undefined
			|| dstObj == QJsonValue::Undefined || statObj == QJsonValue::Undefined) {
		qWarning() << "[ERROR] Bad movement message format";
		return ProcessStatus::Nack;
	}

	auto svc  = svcObj.toString();
	auto src  = srcObj.toString();
	auto dst  = dstObj.toString();
	auto stat = statObj.toString();

	if (svc.isNull() || src.isNull()
			|| dst.isNull() || stat.isNull()) {
		qWarning() << "[ERROR] Bad json fields type";
		return ProcessStatus::Nack;
	}

	qDebug() << "[TRACE] got movement message from" << svc
			 << src << "->" << dst << "status:" << stat;
	//Блокировать вершину нужно после удачной отправки сообщения
	if (stat == NeedMovement) {
		//auto loc = _controller.nextLocation(src, dst);
		QString loc("testloc");
		if (loc.isNull())
			return ProcessStatus::Retry;
		if (postMovementRequest(src, loc, svc, prop.correlation_id, prop.reply_to))
			return ProcessStatus::Error;

	} else if (stat == DoneMovement) {
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

}

GtcLogic::ProcessStatus
GtcLogic::processMaintainRequest(const QJsonDocument &doc)
{

}

qint32 GtcLogic::postMovementRequest(const QString &src, const QString &dst, const QString &svc,
									 const amqp_bytes_t &corrId, const amqp_bytes_t &replyTo)
{
	QJsonObject answer;
	answer.insert("service", svc);
	answer.insert("request", MovementRequest);
	answer.insert("from", src);
	answer.insert("to", dst);

	QJsonDocument doc(answer);
	QByteArray data(doc.toJson(QJsonDocument::Compact));

	amqp_basic_properties_t prop;
//	prop.content_type = amqp_cstring_bytes(_content_type.constData());
//	prop.content_encoding = amqp_cstring_bytes(_content_encoding.constData());
	prop.reply_to = _queuename;
//	prop.correlation_id = corrId;

	auto r = amqp_basic_publish(_connect, 1, amqp_empty_bytes, replyTo, 0, 0,
								NULL, amqp_cstring_bytes(data.constData()));

	return (r == AMQP_STATUS_OK) ? 0 : -1;
}



qint32 GtcLogic::checkConnection()
{
	_status = amqp_get_rpc_reply(_connect);
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

	_connect = amqp_new_connection();
	if (!_connect) {
		qWarning() << "[ERROR] fail create new connection";
		return EINVAL;
	}

	return 0;
}

qint32 GtcLogic::readJsonConfig(const QJsonObject &credits)
{
	if (credits["hostname"].isUndefined() || credits["vhost"].isUndefined() ||
			credits["password"].isUndefined() || credits["username"].isUndefined()) {
		qWarning() << "[ERROR] some login credits are missing";
		return EINVAL;
	}

	if (credits["port"].isUndefined()) {
		qWarning() << "[ERROR] port not found";
		return EINVAL;
	}

	if (credits["contentType"].isUndefined() || credits["contentEncoding"].isUndefined()) {
		qWarning() << "[ERROR] content info not found";
		return EINVAL;
	}

	if (credits["exchange"].isUndefined() || credits["exchangeType"].isUndefined() ||
			credits["bindingKey"].isUndefined() || credits["consumerName"].isUndefined()) {
		qWarning() << "[ERROR] some stream data are missing";
		return EINVAL;
	}

	_hostname     = credits["hostname"].toString();
	_vhost        = credits["vhost"].toString();
	_password     = credits["password"].toString();
	_username     = credits["username"].toString();
	_exchange     = credits["exchange"].toString();
	_exchangeType = credits["exchangeType"].toString();
	_bindingKey   = credits["bindingKey"].toString();
	_consumerName = credits["consumerName"].toString();
	_port         = credits["port"].toInt();
	_content_type = credits["contentType"].toString().toUtf8();
	_content_encoding = credits["contentEncoding"].toString().toUtf8();

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
	_status = amqp_login(_connect, vhost.c_str(), 200, 131072, 0,
						 AMQP_SASL_METHOD_PLAIN, user.c_str(), passwd.c_str());
	if (_status.reply_type != AMQP_RESPONSE_NORMAL) {
		qWarning() << "[ERROR] " << amqp_error_string(_status.reply_type);
		return EAGAIN;
	}

	qDebug() << "[INFO] opening channel";
	amqp_channel_open(_connect, 1);
	if (checkConnection())
		return EAGAIN;

	if (auto r = openMsgQueueStream())
		return r;

	return 0;
}

qint32 GtcLogic::openTcpSocket()
{
	const auto &host   = _hostname.toStdString();

	_socket = amqp_tcp_socket_new(_connect);
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
	amqp_exchange_declare(_connect, 1, amqp_cstring_bytes(exch.c_str()),
						  amqp_cstring_bytes(exchType.c_str()), 0, 1, 0, 0, amqp_empty_table);
	if (checkConnection())
		return EAGAIN;

	qDebug() << "[INFO] declaring queue";
	auto r = amqp_queue_declare(_connect, 1, amqp_cstring_bytes(bindKey.c_str()),
								0, 1, 0, 0, amqp_empty_table);
	if (checkConnection())
		return EAGAIN;

	_queuename = amqp_bytes_malloc_dup(r->queue);
	if (_queuename.bytes == NULL) {
		qWarning() << "[ERROR] out of memory";
		return EAGAIN;
	}

	qDebug() << "[INFO] bind queue";
	amqp_queue_bind(_connect, 1, _queuename, amqp_cstring_bytes(exch.c_str()),
					amqp_cstring_bytes(bindKey.c_str()), amqp_empty_table);
	if (checkConnection())
		return EAGAIN;

	qDebug() << "[INFO] create basic consume:" << _consumerName;
	amqp_basic_consume(_connect, 1, _queuename, amqp_cstring_bytes(consumer.c_str()),
					   1, 0, 0, amqp_empty_table);
	if (checkConnection())
		return EAGAIN;

	return 0;
}

qint32 GtcLogic::process()
{
	amqp_envelope_t envelope;
	amqp_maybe_release_buffers(_connect);

	_status = amqp_consume_message(_connect, &envelope, NULL, 0);
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
	if (request == MovementRequest)
		st = processMovementRequest(doc, envelope.message.properties);
	else if (request == AcceptRequest)
		st = processAcceptRequest(doc);
	else if (request == MaintainRequest)
		st = processMaintainRequest(doc);
	else
		st = ProcessStatus::Nack;

	switch (st) {
	case ProcessStatus::Ack:
		qDebug() << "[TRACE] ack" << request << "message";
		//amqp_basic_ack(_connect, 1, envelope.delivery_tag, 0);
		break;
	case ProcessStatus::Retry:
		qDebug() << "[TRACE] requeue" << request << "message";
		//amqp_basic_nack(_connect, 1, envelope.delivery_tag, 0, true);
		break;
	case ProcessStatus::Nack:
		qWarning() << "[WARNING] bad json data:" << request;
		//amqp_basic_nack(_connect, 1, envelope.delivery_tag, 0, false);
		break;
	case ProcessStatus::Error:
		qWarning() << "[ERROR] fail to process" << request << "message";
		//amqp_basic_nack(_connect, 1, envelope.delivery_tag, 0, true);
		break;
	}
	amqp_basic_ack(_connect, 1, envelope.delivery_tag, 0);
	amqp_destroy_envelope(&envelope);

	return (st != ProcessStatus::Error) ? 0 : EAGAIN;
}

void GtcLogic::close()
{
	qDebug() << "[INFO] close gtc logic";
	amqp_bytes_free(_queuename);
	_queuename = {0, NULL};

	amqp_channel_close(_connect, 1, AMQP_REPLY_SUCCESS);
	amqp_connection_close(_connect, AMQP_REPLY_SUCCESS);
}

void GtcLogic::destroy()
{
	qDebug() << "[INFO] destroy gtc logic";
	amqp_destroy_connection(_connect);
}
