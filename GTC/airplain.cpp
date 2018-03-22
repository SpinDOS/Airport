#include "airplain.h"


Airplain::State Airplain::maintain(const QString &svc)
{
	switch (_state) {
	case State::Unloading:
		if (svc == "bus")
			_isBusUnload = true;
		else if (svc == "baggage")
			_isBaggageUnload = true;

		if (_isBusUnload && _isBaggageUnload)
			_state = State::Fueling;
		break;

	case State::Fueling:
		_state = State::Loading;
		break;

	case State::Loading:
		if (svc == "bus")
			_isBusLoad = true;
		else if (svc == "baggage")
			_isBaggageLoad = true;

		if (_isBusLoad && _isBaggageLoad)
			_state = State::Departure;
		break;

	case State::Departure:
		_state = State::Away;
		break;

	default:
		break;
	}
	return _state;
}

Airplain::State Airplain::state()
{
	return _state;
}

void Airplain::setParkingId(const QString &parkingId)
{
	_parkingId = parkingId;
}

const QString &Airplain::getParkingId()
{
	return _parkingId;
}
