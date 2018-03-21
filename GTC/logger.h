#ifndef LOGGER_H
#define LOGGER_H

#include <QString>
#include <QTime>
#include <QDebug>

class Logger {
	const QString _logicName;

public:

	Logger(const QString &name)
		: _logicName(name)
	{
	}

	template<typename T>
	inline T errorRet(const T &val, const QString &s)
	{
		error(s);
		return val;
	}

	inline void error(const QString &s)
	{
		QString output = QTime::currentTime().toString("hh:mm:ss") + " "
				+ _logicName + " [ERROR] " + s;
		qCritical() << output;
	}

	inline void warn(const QString &s)
	{
		QString output = QTime::currentTime().toString("hh:mm:ss") + " "
				+ _logicName + " [WARNING] " + s;
		qWarning() << output;
	}

	inline void info(const QString &s)
	{
		QString output = QTime::currentTime().toString("hh:mm:ss") + " "
				+ _logicName + " [INFO] " + s;
		qInfo() << output;
	}
};

#endif // LOGGER_H
