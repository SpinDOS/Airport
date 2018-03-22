#ifndef TRAFFIC_CONTROL_H
#define TRAFFIC_CONTROL_H

#include <QMap>
#include <QVector>
#include <QQueue>
#include <QFile>

#include "logger.h"

class TrafficControl {

	Logger _log {"Router  "};

	struct Node {
		qint8 busy = 0;
		QVector<qint32> route;
	};

	const QString EmptyVertex = QString();

	QMap<QString, qint32> _map;
	QMap<qint32, QString> _mirrorMap;

	QVector<Node> _adj;

	qint32 readNodes(const QStringList &nodes);

public:
	qint32 init(const QString &path);
	const QString &moveTo(const QString &src, const QString &dst);

	void lock(const QString &src, const QString &dst);
	void unlock(const QString &src);
};


#endif // TRAFFIC_CONTROL_H
