import { IsString, IsNotEmpty } from "class-validator";
import { validateInput, transformAndValidateSingle } from "./validateWrapper";

export class FollowMeStart {

  @IsString()
  @IsNotEmpty()
  carId!: string;

  static validate(followMeStart: validateInput): FollowMeStart {
    return transformAndValidateSingle(FollowMeStart, followMeStart);
  }
}

export class FollowMeEnd {

  @IsString()
  @IsNotEmpty()
  parkingId!: string;

  static validate(followMeEnd: validateInput): FollowMeEnd {
    return transformAndValidateSingle(FollowMeEnd, followMeEnd);
  }
}