import { Type } from "class-transformer";
import { ValidateNested, IsPositive, IsNumber, IsInt } from "class-validator";
import { Flight } from "./Flight";
import { transformAndValidateSingle, validateInput } from "./validateWrapper";

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

  static validate(airplaneCreateParams: validateInput): AirplaneCreateParams {
    return transformAndValidateSingle(AirplaneCreateParams, airplaneCreateParams);
  }
}