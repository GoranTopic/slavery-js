import "../chunk-V6TY7KAL.js";
async function interval_await({ condition, timeout = 1e4, interval = 100, error = "hasTimedOut" }) {
  return await new Promise(async (resolve, reject) => {
    let timeout_obj;
    let interval_obj;
    if (timeout > 0) {
      timeout_obj = setTimeout(() => {
        clearInterval(interval_obj);
        reject(new Error(error));
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
  }).catch((error2) => {
    throw error2;
  });
}
var await_interval_default = interval_await;
export {
  await_interval_default as default
};
//# sourceMappingURL=await_interval.js.map