#ifndef SERVICE_H
#define SERVICE_H


struct Airplain {
	enum class AirplainState {
		Unloading,
		Fueling,
		Landing,
		Departure,
		Away
	};

	AirplainState state = AirplainState::Unloading;
	int parkingId = -1;

	AirplainState nextState()
	{
		switch (state) {
		case AirplainState::Unloading:
			state = AirplainState::Fueling;
			break;
		case AirplainState::Fueling:
			state = AirplainState::Landing;
			break;
		case AirplainState::Landing:
			state = AirplainState::Departure;
			break;
		case AirplainState::Departure:
			state = AirplainState::Away;
			break;
		default:
			break;
		}

		return state;
	}
};



#endif // SERVICE_H
