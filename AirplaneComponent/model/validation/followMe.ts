import * as helper from "./helper";

export function validateFMStart(followMeStart: any): { carId: string } {
  followMeStart = helper.validateNotEmpty(followMeStart, "Not found start Follow-Me request params");

  return {
    carId: helper.validateNotEmptyString(followMeStart.carId, "Invalid id of Follow-Me car"),
  };
}

export function validateFMEndToParking(followMeEnd: any): { parkingId: string } {
  followMeEnd = helper.validateNotEmpty(followMeEnd, "Not found end Follow-Me request params");

  return {
    parkingId: helper.validateNotEmptyString(followMeEnd.parkingId,
                      "Invalid parking id after end of work of Follow-Me car"),
  };
}

export function validateFMEndToStrip(followMeEnd: any): { stripId: string } {
  followMeEnd = helper.validateNotEmpty(followMeEnd, "Not found end Follow-Me request params");

  return {
    stripId: helper.validateNotEmptyString(followMeEnd.stripId,
                      "Invalid strip id after end of work of Follow-Me car"),
  };
}