import { Guid } from 'guid-typescript';
import { Flight } from './flight'
import { Passenger } from './passenger';
import { Baggage } from './baggage';
import { AirplaneModel } from './airplaneModel';

export interface Airplane {
  readonly id: Guid,
  readonly model: AirplaneModel,

  readonly landingFlight: Flight,
  readonly departureFlight: Flight,

  fuel: number,
  passengers: Passenger[],
  baggages: Baggage[],

  status: AirplaneStatus,
}

