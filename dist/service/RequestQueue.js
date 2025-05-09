import {
  __publicField
} from "../chunk-V6TY7KAL.js";
class RequestQueue {
  // Timeout for requests
  constructor({ process_request, get_slave, options }) {
    /* This class will keep track of all the requests that are made to the service,
     * how long each request takes to be processed,
     * how many requests are in the queue,
     * when the requests are being processed, and
     * request individually.
     */
    __publicField(this, "queue", []);
    __publicField(this, "process_request");
    __publicField(this, "currentId", 0);
    __publicField(this, "get_slave");
    __publicField(this, "isIntervalRunning", false);
    __publicField(this, "interval");
    __publicField(this, "heartbeat");
    __publicField(this, "turnover_times", []);
    // Stores time taken for the last 500 requests
    __publicField(this, "MAX_TURNOVER_ENTRIES", 500);
    // Limit storage to last 500 requests
    __publicField(this, "requestTimeout");
    this.process_request = async (slave, request) => {
      let result = await process_request(slave, request);
      return { result, id: request.id };
    };
    this.get_slave = get_slave;
    this.heartbeat = options?.heartbeat || 10;
    this.requestTimeout = options?.requestTimeout || 5 * 60 * 1e3;
    if (!this.process_request) throw new Error("Process request cannot be null");
    if (!this.get_slave) throw new Error("Get slave cannot be null");
    this.interval = setInterval(async () => {
      if (this.isIntervalRunning) return;
      if (this.queue.length === 0) {
        this.isIntervalRunning = false;
        return;
      }
      this.isIntervalRunning = true;
      for (let request of this.queue) {
        if (request.completed) {
          this.queue = this.queue.filter((r) => r.id !== request.id);
          request.onComplete();
          this.isIntervalRunning = false;
          this.addTurnOverTime(request.startTime);
          return;
        } else if (request.isProcessing) {
          if (Date.now() - request.startTime > this.requestTimeout) {
            request.completed = true;
            request.result = {
              isError: true,
              error: new Error(`slavery-js: Request '${request.method}', timed out after: ${this.requestTimeout}.  You can change this behavior by setting the 'timeout', and 'onError' in the options at slavery({})`)
            };
          }
        } else {
          request.isProcessing = true;
          const slave = await this.get_slave(request.selector);
          this.isIntervalRunning = false;
          this.process_request(slave, request).then(({ result, id }) => {
            let request2 = this.getRequest(id);
            if (request2) {
              request2.completed = true;
              request2.result = result;
            }
          }).catch((err) => {
            throw new Error("slavery-js [RequestQueue]: this Error should not be reachable, please report this issue", err);
          });
        }
      }
      this.isIntervalRunning = false;
    }, this.heartbeat);
  }
  addRequest({ method, type, parameters, selector }) {
    return new Promise(async (resolve) => {
      if (this.currentId >= Number.MAX_SAFE_INTEGER) this.currentId = 0;
      let request = {
        id: ++this.currentId,
        method,
        type,
        parameters,
        selector: selector || void 0,
        completed: false,
        isProcessing: false,
        onComplete: () => {
          resolve(request.result);
        },
        startTime: Date.now(),
        result: null
      };
      this.queue.push(request);
    });
  }
  getRequest(id) {
    const request = this.queue.find((r) => r.id === id);
    if (request) {
      return request;
    } else {
      return null;
    }
  }
  addTurnOverTime(startTime) {
    const timeTaken = Date.now() - startTime;
    this.turnover_times.push(timeTaken);
    if (this.turnover_times.length > this.MAX_TURNOVER_ENTRIES)
      this.turnover_times.shift();
  }
  queueSize() {
    return this.queue.length;
  }
  getTurnoverRatio() {
    if (this.turnover_times.length === 0) return 0;
    const sum = this.turnover_times.reduce((acc, time) => acc + time, 0);
    return sum / this.turnover_times.length;
  }
  getTurnoverTimes() {
    return this.turnover_times;
  }
  exit() {
    this.queue = [];
    clearInterval(this.interval);
  }
}
var RequestQueue_default = RequestQueue;
export {
  RequestQueue_default as default
};
//# sourceMappingURL=RequestQueue.js.map