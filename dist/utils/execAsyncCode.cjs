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
var execAsyncCode_exports = {};
__export(execAsyncCode_exports, {
  default: () => execAsyncCode_default
});
module.exports = __toCommonJS(execAsyncCode_exports);
const AsyncFunction = Object.getPrototypeOf(async function() {
}).constructor;
async function runAsyncCode(codeString, context = {}) {
  let userFunc;
  if (typeof codeString !== "string")
    throw new TypeError("The first argument must be a string of code");
  if (isCallbackString(codeString)) {
    try {
      userFunc = eval(`(${codeString})`);
      let result = await userFunc(context);
      return result;
    } catch (error) {
      throw error;
    }
  }
  try {
    userFunc = new AsyncFunction(...Object.keys(context), codeString);
    const result2 = await userFunc(...Object.values(context));
    return result2;
  } catch (error) {
    throw error;
  }
}
function isCallbackString(code) {
  try {
    const fn = eval(`(${code})`);
    return typeof fn === "function";
  } catch (e) {
    return false;
  }
}
var execAsyncCode_default = runAsyncCode;
//# sourceMappingURL=execAsyncCode.cjs.map