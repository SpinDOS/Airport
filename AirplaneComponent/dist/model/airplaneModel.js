"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var random_1 = require("../utils/random");
function findRandomModel(passengersCount, baggageWeight) {
    var matching = exports.allModels.filter(function (model) { return model.maxPassengersCount >= passengersCount && model.maxBaggageWeight >= baggageWeight; });
    if (matching.length == 0)
        throw Error("Can not find model that can carry " + passengersCount + " passengers and " + baggageWeight + " kg of baggage");
    return matching[random_1.random0toMax(matching.length)];
}
exports.findRandomModel = findRandomModel;
exports.allModels = [
    {
        name: 'Boeing 747',
        maxFuel: 100,
        maxPassengersCount: 1000,
        maxBaggageWeight: 1000,
    }
];
//# sourceMappingURL=airplaneModel.js.map