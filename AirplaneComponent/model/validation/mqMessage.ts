import { ValidationError } from "../../errors/validationError";
import { isNotEmptyString } from "../../utils/validation";

export interface IMQMessage {
  type: string;
  replyTo?: string;
  correlationId?: string;
  value: any;
}

export function validateMQMessage(mqMessage: any): IMQMessage {
  if (!mqMessage) {
    throw new ValidationError("MQ message is empty");
  }

  if (!isNotEmptyString(mqMessage.type)) {
    throw new ValidationError("Invalid type of MQ message's type");
  }

  return {
    type: mqMessage.type,
    value: mqMessage.value,
  };
}