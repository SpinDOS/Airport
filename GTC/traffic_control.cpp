#include "traffic_control.h"


qint32 TrafficControl::readNodes(const QStringList &nodes)
{
	qint32 id = 0;
	foreach (const auto &n, nodes) {
		_map[n] = id;
		_mirrorMap[id] = n;
		id++;
	}

	_adj.resize(_map.size());
	return nodes.size();
}

qint32 TrafficControl::init(const QString &path)
{
	QFile file;

	file.setFileName(path);
	if (!file.open(QIODevice::ReadOnly | QIODevice::Text))
		return _log.errorRet(-1, "fail open graph file");

	QTextStream stream(&file);
	qint32 nCount = readNodes(stream.readLine().split(" "));

	_log.info("read " + QString::number(nCount) + " nodes");

	while (!stream.atEnd()) {
		auto route = stream.readLine().split(" ");
		int src = _map[route[0]];
		int dst = _map[route[1]];
		_adj[src].route.push_back(dst);
	}

	file.close();

	return 0;
}

const QString &
TrafficControl::moveTo(const QString &src, const QString &dst)
{
	qint32 srcId = _map[src];
	qint32 dstId = _map[dst];
	qint32 n = _map.size();

	QQueue<qint32> q;
	QVector<qint8> used(n, 0);
	QVector<qint32> parents(n, 0);

	q.push_back(srcId);
	used[srcId] = 1;
	parents[srcId] = -1;

	while (!q.empty()) {
		qint32 v = q.front();
		q.pop_front();
		foreach (qint32 to, _adj[v].route)
			if (!used[to]) {
				used[to] = 1;
				q.push_back(to);
				parents[to] = v;
			}
	}

	if (!used[dstId]) {
		_log.warn("no path found from: " + src + " to: " + dst);
		return EmptyVertex;
	}

	qint32 nextId = -1;
	for (qint32 v = dstId; v != -1; v = parents[v])
		if (parents[v] == srcId)
			nextId = v;

	if (_adj[nextId].busy)
		return EmptyVertex;

	const auto &nextLoc = _mirrorMap[nextId];
	_log.info("src -> " + src + " dst -> " + nextLoc);
	return nextLoc;
}

void TrafficControl::lock(const QString &src, const QString &dst)
{
	_adj[_map[src]].busy = _adj[_map[dst]].busy = 1;
}

void TrafficControl::unlock(const QString &src)
{
	_adj[_map[src]].busy = 0;
}
