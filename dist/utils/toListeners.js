"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* this function will take a type slaveMethods passed to a Service and return a type Listener */
function toListeners(slaveMethods) {
    return Object.keys(slaveMethods).map((key) => ({
        event: key,
        parameters: slaveMethods[key].length > 0 ? new Array(slaveMethods[key].length).fill(undefined) : undefined,
        callback: slaveMethods[key],
    }));
}
exports.default = toListeners;
//# sourceMappingURL=toListeners.js.map