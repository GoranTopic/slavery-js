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
var makeProxyObject_exports = {};
__export(makeProxyObject_exports, {
  default: () => makeProxyObject_default
});
module.exports = __toCommonJS(makeProxyObject_exports);
let proxy;
const makeProxyObject = (callback) => {
  const proxyObjecHandler = makeProxyObjecHandler(callback);
  proxy = new Proxy({}, proxyObjecHandler);
  return proxy;
};
const makeProxyObjecHandler = (callback) => ({
  get(target, prop) {
    return (args, args2, args3) => {
      let method = prop;
      let param1 = args;
      let param2 = args2;
      let param3 = args3;
      if (typeof args !== "function" && typeof args !== "object")
        throw new Error("first parameter must be a function or an object");
      if (args2 !== void 0 && typeof args2 !== "object")
        throw new Error("second parameter must be an object");
      if (args3 !== void 0 && typeof args3 !== "object")
        throw new Error("third parameter must be an object");
      callback(method, param1, param2, param3);
      return proxy;
    };
  }
});
var makeProxyObject_default = makeProxyObject;
//# sourceMappingURL=makeProxyObject.cjs.map