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
var import_index = require("./index.js");
var import_network = require("../network/index.js");
async function isServerActive({ name, host, port, timeout }) {
  return new Promise((resolve) => {
    const connection = new import_network.Connection({
      host,
      port,
      id: "connection_test" + Math.random(),
      timeout: 1e4,
      // Increased timeout (e.g. 10 seconds)
      onConnect: (connection2) => {
        resolve(true);
        connection2.close();
      }
    });
    connection.on("connect_error", () => {
      (0, import_index.log)(`Connection error to ${name} at ${host}:${port}`);
    });
    connection.on("connect_timeout", () => {
      (0, import_index.log)(`Connection timeout to ${name} at ${host}:${port}`);
      resolve(false);
      connection.close();
    });
    connection.connected();
    setTimeout(() => {
      resolve(false);
      connection.close();
    }, 12e3);
  });
}
var isServerActive_default = isServerActive;
//# sourceMappingURL=isServerActive.cjs.map