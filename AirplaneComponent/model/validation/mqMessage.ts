import { ValidationError } from "../../errors/validationError";
import { isNotEmptyString } from "../../utils/utils";

export interface IMQMessage {
  type: string;
  value: any;
  // from properties, not body
  properties: {
    replyTo?: string;
    correlationId?: string;
  };
}

export function validateMQMessage(mqMessage: any): IMQMessage {
  if (!mqMessage) {
    throw new ValidationError("MQ message is empty");
  }

  let type: any = mqMessage.type;
  if (!isNotEmptyString(type)) {
    throw new ValidationError("Invalid type of MQ message: " + type);
  }

  return {
    type: type,
    value: mqMessage.value,
    properties: { }
  };
}