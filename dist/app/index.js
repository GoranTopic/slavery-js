"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMasterCallback = exports.isServiceOptions = exports.isSlaveMethods = exports.extractFunctions = exports.makeProxyObject = exports.PeerDiscoverer = void 0;
const entry_1 = __importDefault(require("./entry"));
const typeGuards_js_1 = require("./typeGuards.js");
Object.defineProperty(exports, "isSlaveMethods", { enumerable: true, get: function () { return typeGuards_js_1.isSlaveMethods; } });
Object.defineProperty(exports, "isServiceOptions", { enumerable: true, get: function () { return typeGuards_js_1.isServiceOptions; } });
Object.defineProperty(exports, "isMasterCallback", { enumerable: true, get: function () { return typeGuards_js_1.isMasterCallback; } });
const makeProxyObject_js_1 = __importDefault(require("./makeProxyObject.js"));
exports.makeProxyObject = makeProxyObject_js_1.default;
const extractFunctions_js_1 = __importDefault(require("./extractFunctions.js"));
exports.extractFunctions = extractFunctions_js_1.default;
const index_js_1 = __importDefault(require("./peerDiscovery/index.js"));
exports.PeerDiscoverer = index_js_1.default;
exports.default = entry_1.default;
//# sourceMappingURL=index.js.map