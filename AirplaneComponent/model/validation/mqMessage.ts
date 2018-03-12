import { IsString, IsNotEmpty } from "class-validator";

export class MQMessage {

  @IsString()
  @IsNotEmpty()
  type!: string;

  value: any;
}