"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var isServerActive_exports = {};
__export(isServerActive_exports, {
  default: () => isServerActive_default
});
module.exports = __toCommonJS(isServerActive_exports);
var import_network = require("../network/index.js");
const resolve_timout_pointer = (timeout_pointer) => {
  if (timeout_pointer) {
    clearTimeout(timeout_pointer);
    timeout_pointer = null;
  }
};
async function isServerActive({ name, host, port, timeout }) {
  if (timeout === void 0) {
    timeout = 5e3;
  }
  return new Promise((resolve) => {
    let timeout_pointer = null;
    const connection = new import_network.Connection({
      host,
      port,
      id: "connection_test" + Math.random(),
      options: {
        timeout: 1e4,
        // Increased timeout (e.g. 10 second
        onConnect: (connection2) => {
          connection2.close();
          resolve_timout_pointer(timeout_pointer);
          resolve(true);
        }
      }
    });
    connection.on("connect_error", () => {
    });
    connection.on("connect_timeout", () => {
      resolve(false);
      connection.close();
      resolve_timout_pointer(timeout_pointer);
    });
    connection.connected();
    timeout_pointer = setTimeout(() => {
      console.error(`Timeout waiting for ${name} at ${host}:${port}`);
      connection.close();
      resolve(false);
    }, timeout);
  });
}
var isServerActive_default = isServerActive;
//# sourceMappingURL=isServerActive.cjs.map