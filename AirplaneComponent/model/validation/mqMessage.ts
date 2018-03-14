import { IsString, IsNotEmpty } from "class-validator";
import { transformAndValidateSingle, validateInput } from "./validateWrapper";

export class MQMessage {

  @IsString()
  @IsNotEmpty()
  type!: string;

  value: any;

  static validate(mqMessage: validateInput): MQMessage {
    return transformAndValidateSingle(MQMessage, mqMessage);
  }
}