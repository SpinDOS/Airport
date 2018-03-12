import { Type } from "class-transformer";
import { ValidateNested, IsPositive, IsNumber, IsInt } from "class-validator";
import { Flight } from "./Flight";

export class FlightInfo extends Flight {

  @IsInt()
  @IsPositive()
  passengersCount!: number;

  @IsNumber()
  @IsPositive()
  serviceBaggageCount!: number;
}

export class AirplaneCreateParams {

  @Type(() => FlightInfo)
  @ValidateNested()
  landingFlight!: FlightInfo;

  @Type(() => FlightInfo)
  @ValidateNested()
  departureFlight!: FlightInfo;
}