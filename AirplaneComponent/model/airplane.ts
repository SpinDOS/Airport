import { Guid } from 'guid-typescript';
import { IFlight } from './flight'
import { IPassenger } from './passenger';
import { IBaggage } from './baggage';
import { IAirplaneModel } from './airplaneModel';

export interface IAirplane {
  readonly id: Guid,
  readonly model: IAirplaneModel,

  readonly landingFlight: IFlight,
  readonly departureFlight: IFlight,

  fuel: number,
  passengers: IPassenger[],
  baggages: IBaggage[],

  status: AirplaneStatus,
}

