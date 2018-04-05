import { Guid } from "guid-typescript";
import * as helper from "./helper";

export function validateFlyReq(fly: any): { airplaneId: Guid } {
  fly = helper.validateNotEmpty(fly, "Not found fly request params");

  return {
    airplaneId: helper.validateGuid(fly.airplaneId, "Invalid airplane id for fly request"),
  };
}