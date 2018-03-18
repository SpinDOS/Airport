#ifndef SERVICE_H
#define SERVICE_H

#include <QObject>

struct Airplain {
	enum class State {
		Unloading,
		Fueling,
		Loading,
		Departure,
		Away
	};

	bool isBusUnload = false, isBaggageUnload = false;
	bool isBusLoad = false, isBaggageLoad = false;

	State state = State::Unloading;
	QString parkingId;

	State nextState()
	{
		switch (state) {
		case State::Unloading:
			if (isBusUnload && isBaggageUnload)
				state = State::Fueling;
			break;
		case State::Fueling:
			state = State::Loading;
			break;
		case State::Loading:
			if (isBusLoad && isBaggageLoad)
				state = State::Departure;
			break;
		case State::Departure:
			state = State::Away;
			break;
		default:
			break;
		}

		return state;
	}
};



#endif // SERVICE_H
