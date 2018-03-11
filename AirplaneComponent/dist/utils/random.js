"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
exports.randomInt = randomInt;
function random0toMax(max) {
    return randomInt(0, max);
}
exports.random0toMax = random0toMax;
//# sourceMappingURL=random.js.map