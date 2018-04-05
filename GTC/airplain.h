#ifndef AIRPLAIN_H
#define AIRPLAIN_H

#include <QObject>
#include "logger.h"

class Airplain {
public:
	enum class State {
		Unloading,
		Fueling,
		Loading,
		Departure,
		Away
	};

private:
	bool _isBusUnload = false, _isBaggageUnload = false;
	bool _isBusLoad = false, _isBaggageLoad = false;

	State _state = State::Unloading;
	QString _parkingId;

public:
	State maintain(const QString &svc);

	State state();

	void setParkingId(const QString &parkingId);

	const QString &getParkingId();
};



#endif // AIRPLAIN_H
