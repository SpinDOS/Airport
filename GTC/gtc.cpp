#include "gtc.h"

#include <QFile>
#include <QJsonObject>
#include <QJsonDocument>

#include <cstdio>
#include <cstring>

//qint32 process(const QJsonDocument &doc)
//	size_t body_len = msg->body.len;
//	char *body = static_cast<char *>(msg->body.bytes);

//	size_t corrid_len = msg->properties.correlation_id.len;
//	char *corrid = static_cast<char *>(msg->properties.correlation_id.bytes);

//	size_t repl_to_len = msg->properties.reply_to.len;
//	char *repl_to = static_cast<char *>(msg->properties.reply_to.bytes);

//	fwrite(body, sizeof(char), body_len, stdout);
//	printf("\n");

//	fwrite(corrid, sizeof(char), corrid_len, stdout);
//	printf("\n");

//	fwrite(repl_to, sizeof(char), repl_to_len, stdout);
//	printf("\n");

//	char q[256] = {0};
//	strncpy(q, repl_to, repl_to_len);
//	int r = amqp_basic_publish(_connect, 1, amqp_empty_bytes, amqp_cstring_bytes(q), 0, 0, &msg->properties, msg->body);

//	printf("%s %d\n", q, r);
//	return 0;
//}

GtcLogic::ProcessStatus
GtcLogic::processMovementRequest(const QJsonDocument &doc, amqp_basic_properties_t *prop)
{
	auto service = doc["service"];
	auto from = doc["from"];
	auto to = doc["to"];

	if (service == QJsonValue::Undefined || from == QJsonValue::Undefined || to == QJsonValue::Undefined) {
		qWarning() << "[ERROR] Bad movement message format";
		return ProcessStatus::Nack;
	}

	auto serviceVal = service.toString();
	auto fromVal = from.toString();
	auto toVal = to.toString();

	if (serviceVal == Q_NULLPTR || fromVal == Q_NULLPTR || toVal == Q_NULLPTR) {
		qWarning() << "[ERROR] Bad json fields type";
		return ProcessStatus::Nack;
	}

	auto location = _controller.nextLocation(fromVal, toVal);
	if (location.length() == 0)
		return ProcessStatus::Retry;

	//TODO: postMovementRequest
}

GtcLogic::ProcessStatus
GtcLogic::processAcceptRequest(const QJsonDocument &doc)
{

}

GtcLogic::ProcessStatus
GtcLogic::processMaintainRequest(const QJsonDocument &doc)
{

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

	qDebug() << "[INFO] init amqp connection";
	if (auto r = initAmqpConnection())
		return r;

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

	return 0;
}

qint32 GtcLogic::initAmqpConnection()
{
	_connect = amqp_new_connection();
	if (!_connect) {
		qWarning() << "[ERROR] fail create new connection";
		return EINVAL;
	}

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

	qDebug() << "[INFO] create basic consume: " << _consumerName;
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
		qWarning() << "[ERROR] got EOF from socket: " << amqp_error_string(_status.reply_type);
		return EAGAIN;
	case AMQP_RESPONSE_LIBRARY_EXCEPTION:
		qWarning() << "[ERROR] unknown library exception";
		return EAGAIN;
	case AMQP_RESPONSE_SERVER_EXCEPTION:
		qWarning() << "[ERROR] server exception: " << amqp_error_string(_status.reply_type);
		return EAGAIN;
	default:
		break;
	}

	char *bytes = static_cast<char *>(envelope.message.body.bytes);
	QByteArray jsonMsg(bytes, envelope.message.body.len);
	QJsonDocument doc = QJsonDocument::fromJson(jsonMsg);
	auto requestValue = getRequest(doc);

	ProcessStatus st;
	if (requestValue == MovementRequest)
		st = processMovementRequest(doc, &envelope.message.properties);
	else if (requestValue == AcceptRequest)
		st = processAcceptRequest(doc);
	else if (requestValue == MaintainRequest)
		st = processMaintainRequest(doc);
	else
		st = ProcessStatus::Nack;

	switch (st) {
	case ProcessStatus::Ack:
		qDebug() << "[TRACE] ack " << requestValue << "message";
		amqp_basic_ack(_connect, 1, envelope.delivery_tag, 0);
		break;
	case ProcessStatus::Retry:
		qDebug() << "[TRACE] requeue" << requestValue << "message";
		amqp_basic_nack(_connect, 1, envelope.delivery_tag, 0, true);
		break;
	case ProcessStatus::Nack:
		qWarning() << "[WARNING] Unknow request" << requestValue;
		amqp_basic_nack(_connect, 1, envelope.delivery_tag, 0, false);
		break;
	case ProcessStatus::Error:
		qWarning() << "[ERROR] Fail to process" << requestValue << "message";
		amqp_basic_nack(_connect, 1, envelope.delivery_tag, 0, true);
		break;
	}
	amqp_destroy_envelope(&envelope);

	return (st != ProcessStatus::Error) ? 0 : EAGAIN;
}

QString GtcLogic::getRequest(const QJsonDocument &doc)
{
	auto request = doc["request"];
	if (request == QJsonValue::Undefined)
		return Q_NULLPTR;

	return request.toString();
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
