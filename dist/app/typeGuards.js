import "../chunk-V6TY7KAL.js";
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
export {
  isMasterCallback,
  isServiceOptions,
  isSlaveMethods
};
//# sourceMappingURL=typeGuards.js.map