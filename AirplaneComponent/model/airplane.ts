//#region import

import { Guid } from "guid-typescript";

import { IFlight } from "./flight";
import { IPassenger } from "./passenger";
import { IBaggage } from "./baggage";
import { IAirplaneModel } from "./airplaneModel";
import { AirplaneStatus } from "./airplaneStatus";

//#endregion

export interface IAirplane {
  readonly id: Guid;
  readonly model: IAirplaneModel;

  readonly landingFlight: IFlight;
  readonly departureFlight: IFlight;

  fuel: number;
  readonly passengers: IPassenger[];
  readonly baggages: IBaggage[];

  readonly status: {
    type: AirplaneStatus;
    additionalInfo: {
      parkingId?: string,
      buses?: string[],
      baggageCars?: string[],
      followMeCarId?: string,
      fuelerCarId?: string,
      stripId?: string,
     };
  };
}

