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
var typeGuards_exports = {};
__export(typeGuards_exports, {
  isMasterCallback: () => isMasterCallback,
  isServiceOptions: () => isServiceOptions,
  isSlaveMethods: () => isSlaveMethods
});
module.exports = __toCommonJS(typeGuards_exports);
function isSlaveMethods(obj) {
  if (obj === null || obj === void 0) return false;
  return obj && typeof obj === "object" && Object.values(obj).some((value) => typeof value === "function");
}
function isServiceOptions(obj) {
  if (obj === null || obj === void 0) return false;
  return obj && typeof obj === "object" && Object.values(obj).every((value) => typeof value !== "function");
}
function isMasterCallback(value) {
  if (value === null || value === void 0) return false;
  return typeof value === "function";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isMasterCallback,
  isServiceOptions,
  isSlaveMethods
});
//# sourceMappingURL=typeGuards.cjs.map