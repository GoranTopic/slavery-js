import "../chunk-V6TY7KAL.js";
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
export {
  makeProxyObject_default as default
};
//# sourceMappingURL=makeProxyObject.js.map