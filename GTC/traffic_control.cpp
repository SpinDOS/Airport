#include "traffic_control.h"

TrafficControl::TrafficControl(const Environment &e)
    : _env(const_cast<Environment &>(e))
{}

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

qint32 TrafficControl::init()
{
	QFile file;

	file.setFileName(_env.graphPath);
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

	bool noWay = true;
	foreach (const auto &v, _adj[srcId].route)
		if (!_adj[v].busy)
			noWay = false;

	if (noWay)
		return EmptyVertex;

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

	qint32 nextId = dstId;
	for(; parents[nextId] != srcId; nextId = parents[nextId])
		;

	if (_adj[nextId].busy)
		return EmptyVertex;

	const auto &nextLoc = _mirrorMap[nextId];
	_log.info("src -> " + src + " dst -> " + nextLoc);
	return nextLoc;
}

void TrafficControl::lock(const QString &src, const QString &dst)
{
	_adj[_map[src]].busy = 1;

	if (dst == _env.BusGarage || dst == _env.BaggageGarage ||
	        dst == _env.FollowMeGarage || dst == _env.FuelGarage)
		return;

	_adj[_map[dst]].busy = 1;
}

void TrafficControl::unlock(const QString &src)
{
	_adj[_map[src]].busy = 0;
}
