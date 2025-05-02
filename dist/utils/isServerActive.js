import "../chunk-V6TY7KAL.js";
import { Connection } from "../network/index.js";
const resolve_timout_pointer = (timeout_pointer) => {
  if (timeout_pointer) {
    clearTimeout(timeout_pointer);
    timeout_pointer = null;
  }
};
async function isServerActive({ name, host, port, timeout }) {
  if (timeout === void 0) {
    timeout = 5e3;
  }
  return new Promise((resolve) => {
    let timeout_pointer = null;
    const connection = new Connection({
      host,
      port,
      id: "connection_test" + Math.random(),
      timeout: 1e4,
      // Increased timeout (e.g. 10 second
      onConnect: (connection2) => {
        connection2.close();
        resolve_timout_pointer(timeout_pointer);
        resolve(true);
      }
    });
    connection.on("connect_error", () => {
    });
    connection.on("connect_timeout", () => {
      resolve(false);
      connection.close();
      resolve_timout_pointer(timeout_pointer);
    });
    connection.connected();
    timeout_pointer = setTimeout(() => {
      console.error(`Timeout waiting for ${name} at ${host}:${port}`);
      connection.close();
      resolve(false);
    }, timeout);
  });
}
var isServerActive_default = isServerActive;
export {
  isServerActive_default as default
};
//# sourceMappingURL=isServerActive.js.map