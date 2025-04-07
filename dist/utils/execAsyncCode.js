import "../chunk-V6TY7KAL.js";
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
export {
  execAsyncCode_default as default
};
//# sourceMappingURL=execAsyncCode.js.map