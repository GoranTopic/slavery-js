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
var toListeners_exports = {};
__export(toListeners_exports, {
  default: () => toListeners_default
});
module.exports = __toCommonJS(toListeners_exports);
function toListeners(slaveMethods) {
  return Object.keys(slaveMethods).map((key) => ({
    event: key,
    parameters: slaveMethods[key].length > 0 ? new Array(slaveMethods[key].length).fill(void 0) : void 0,
    callback: slaveMethods[key]
  }));
}
var toListeners_default = toListeners;
//# sourceMappingURL=toListeners.cjs.map