import "../chunk-V6TY7KAL.js";
import { log } from "./index.js";
import { Connection } from "../network/index.js";
async function isServerActive({ name, host, port, timeout }) {
  return new Promise((resolve) => {
    const connection = new Connection({
      host,
      port,
      id: "connection_test" + Math.random(),
      timeout: 1e4,
      // Increased timeout (e.g. 10 seconds)
      onConnect: (connection2) => {
        resolve(true);
        connection2.close();
      }
    });
    connection.on("connect_error", () => {
      log(`Connection error to ${name} at ${host}:${port}`);
    });
    connection.on("connect_timeout", () => {
      log(`Connection timeout to ${name} at ${host}:${port}`);
      resolve(false);
      connection.close();
    });
    connection.connected();
    setTimeout(() => {
      resolve(false);
      connection.close();
    }, 12e3);
  });
}
var isServerActive_default = isServerActive;
export {
  isServerActive_default as default
};
//# sourceMappingURL=isServerActive.js.map