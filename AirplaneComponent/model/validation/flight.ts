import { IsOptional, IsUUID, IsString } from "class-validator";
import { IFlight as RealFlight } from "../flight";
import { Guid } from "guid-typescript";
import { transformAndValidateSingle, validateInput } from "./validateWrapper";

export class Flight {

  @IsUUID("4")
  id!: string;

  @IsOptional()
  @IsString()
  code?: string;

  toFlight(): RealFlight {
    return {
      id: Guid.parse(this.id),
      code: this.code,
    };
  }

  static validate(flight: validateInput): Flight {
    return transformAndValidateSingle(Flight, flight);
  }
}