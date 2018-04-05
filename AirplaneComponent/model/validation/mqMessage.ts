import * as helper from "./helper";

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
  mqMessage = helper.validateNotEmpty(mqMessage, "MQ message is empty");

  return {
    type: helper.validateNotEmptyString(mqMessage.type, "Empty type of MQ message"),
    value: mqMessage.value,
    properties: { }
  };
}