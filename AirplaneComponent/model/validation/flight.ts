import { IsOptional, IsUUID, IsString } from "class-validator";
import { Flight as RealFlight } from "../flight";
import { Guid } from "guid-typescript"

export class Flight {

  @IsUUID()
  id!: string;

  @IsOptional()
  @IsString()
  code?: string;

  toFlight(): RealFlight {
    return {
      id: Guid.parse(this.id),
      code: this.code,
    }
  }

}