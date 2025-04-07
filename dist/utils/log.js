"use strict";
// if we get debug mode, we will log everything
Object.defineProperty(exports, "__esModule", { value: true });
const log = (...args) => {
    // if we get debug mode in global scope, we will log everything
    if (process.env.debug === 'true') {
        let pretext = process.env.type ? process.env.type : 'Primary';
        console.log(`[${pretext}]`, ...args);
    }
    else
        return null;
};
exports.default = log;
//# sourceMappingURL=log.js.map