import "../chunk-V6TY7KAL.js";
const log = (...args) => {
  if (process.env.debug === "true") {
    let pretext = process.env.type ? process.env.type : "Primary";
    console.log(`[${pretext}]`, ...args);
  } else return null;
};
var log_default = log;
export {
  log_default as default
};
//# sourceMappingURL=log.js.map