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
var await_interval_exports = {};
__export(await_interval_exports, {
  default: () => await_interval_default
});
module.exports = __toCommonJS(await_interval_exports);
async function interval_await(condition, timeout = 1e4, interval = 100) {
  return await new Promise(async (resolve, reject) => {
    let timeout_obj;
    let interval_obj;
    if (timeout > 0) {
      timeout_obj = setTimeout(() => {
        clearInterval(interval_obj);
        reject("timeout");
      }, timeout);
    }
    interval_obj = setInterval(async () => {
      let result = await condition();
      if (result === true) {
        clearInterval(interval_obj);
        clearTimeout(timeout_obj);
        resolve(result);
      }
    }, interval);
  }).catch((error) => {
    throw error;
  });
}
var await_interval_default = interval_await;
//# sourceMappingURL=await_interval.cjs.map