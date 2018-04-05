import { Guid } from "guid-typescript";
import * as helper from "./helper";

export interface ILandingReq {
  aircraftId: Guid;
  stripId: string;
}

export function validateLandingReq(landingReq: any): ILandingReq {
  landingReq = helper.validateNotEmpty(landingReq, "Empty landing request parameters");

  return {
    aircraftId: helper.validateGuid(landingReq.aircraftId, "Invalid landing request airplane id"),
    stripId:    helper.validateNotEmptyString(landingReq.stripId, "Invalid landing request strip id"),
  };
}