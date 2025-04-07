"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
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
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var RequestQueue_exports = {};
__export(RequestQueue_exports, {
  default: () => RequestQueue_default
});
module.exports = __toCommonJS(RequestQueue_exports);
var import_utils = require("../utils/index.js");
class RequestQueue {
  // Limit storage to last 500 requests
  constructor({ process_request, get_slave }) {
    /* This class will keep track of all the requests that are made to the service,
     * how long each request takes to be processed,
     * how many requests are in the queue,
     * when the requests are being processed, and
     * request individually.
     */
    __publicField(this, "queue", new import_utils.Queue());
    __publicField(this, "process_request");
    __publicField(this, "get_slave");
    __publicField(this, "isRunning", false);
    __publicField(this, "interval");
    __publicField(this, "heartbeat", 100);
    // Check every 100ms if the request is completed
    __publicField(this, "turnover_times", []);
    // Stores time taken for the last 500 requests
    __publicField(this, "MAX_TURNOVER_ENTRIES", 500);
    this.process_request = process_request;
    this.get_slave = get_slave;
    if (!this.process_request) throw new Error("Process request cannot be null");
    if (!this.get_slave) throw new Error("Get slave cannot be null");
    this.interval = setInterval(async () => {
      if (this.isRunning) return;
      if (this.queue.size() === 0) {
        this.isRunning = false;
        return;
      }
      this.isRunning = true;
      let request = this.queue.pop();
      if (request === false) throw new Error("Request is null... is the request queue empty?");
      const slave = await this.get_slave(request.selector);
      let startTime = Date.now();
      let endTime;
      this.isRunning = false;
      this.process_request(slave, request).then(
        (result) => {
          if (!request) throw new Error("Request is false... is the request queue empty?");
          endTime = Date.now();
          request.completed = true;
          request.result = result;
          const timeTaken = endTime - startTime;
          this.turnover_times.push(timeTaken);
          if (this.turnover_times.length > this.MAX_TURNOVER_ENTRIES)
            this.turnover_times.shift();
        }
      ).catch((err) => {
        console.error("[RequestQueue] Request failed to complete");
        console.error(err);
        return err;
      });
    }, 100);
  }
  addRequest(request) {
    return new Promise(async (resolve, reject) => {
      this.queue.push(request);
      await (0, import_utils.await_interval)(() => {
        (0, import_utils.log)(request);
        return request.completed === true;
      }, 60 * 60 * 1e3, this.heartbeat).catch((err) => {
        console.error("[RequestQueue] Request failed to complete");
        console.error(err);
        reject(err);
      });
      resolve(request.result);
    });
  }
  queueSize() {
    return this.queue.size();
  }
  getTurnoverRatio() {
    if (this.turnover_times.length === 0) return 0;
    const sum = this.turnover_times.reduce((acc, time) => acc + time, 0);
    return sum / this.turnover_times.length;
  }
  exit() {
    this.queue.clear();
    clearInterval(this.interval);
  }
}
var RequestQueue_default = RequestQueue;
//# sourceMappingURL=RequestQueue.cjs.map