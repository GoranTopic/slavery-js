import "../chunk-V6TY7KAL.js";
function toListeners(slaveMethods) {
  return Object.keys(slaveMethods).map((key) => ({
    event: key,
    parameters: slaveMethods[key].length > 0 ? new Array(slaveMethods[key].length).fill(void 0) : void 0,
    callback: slaveMethods[key]
  }));
}
var toListeners_default = toListeners;
export {
  toListeners_default as default
};
//# sourceMappingURL=toListeners.js.map