import { Guid } from 'guid-typescript';
import { IFlight } from './flight';
import { IPassenger } from './passenger';
import { IBaggage } from './baggage';
export interface IAirplane {
    readonly id: Guid;
    readonly model: string;
    readonly landingFlight: IFlight;
    readonly departureFlight: IFlight;
    readonly maxFuel: number;
    fuel: number;
    readonly maxPassengersCount: number;
    passengers: IPassenger[];
    readonly maxBaggageWeight: number;
    baggages: IBaggage[];
    status: AirplaneStatus;
}
