import {
  __publicField
} from "../chunk-V6TY7KAL.js";
import os from "os";
import { log } from "../utils/index.js";
class ProcessBalancer {
  constructor(config) {
    __publicField(this, "prevQueueSize", 0);
    __publicField(this, "interval");
    __publicField(this, "queueScaleUpThreshold");
    __publicField(this, "queueScaleDownThreshold");
    __publicField(this, "maxIdleRateThreshold");
    __publicField(this, "minIdleRateThreshold");
    __publicField(this, "cpuThreshold");
    __publicField(this, "memThreshold");
    __publicField(this, "checkInterval");
    __publicField(this, "checkQueueSize");
    __publicField(this, "checkSlaves");
    __publicField(this, "addSlave");
    __publicField(this, "removeSlave");
    this.queueScaleUpThreshold = config.queueScaleUpThreshold || 3;
    this.queueScaleDownThreshold = config.queueScaleDownThreshold || 0;
    this.cpuThreshold = config.cpuThreshold || 90;
    this.memThreshold = config.memThreshold || 90;
    this.maxIdleRateThreshold = config.maxIdleRateThreshold || 0.8;
    this.minIdleRateThreshold = config.minIdleRateThreshold || 0.1;
    this.checkInterval = config.checkInterval || 500;
    this.checkQueueSize = config.checkQueueSize;
    this.checkSlaves = config.checkSlaves;
    this.addSlave = config.addSlave;
    this.removeSlave = config.removeSlave;
    this.checkRequiredFunctions();
    this.interval = this.startMonitoring();
  }
  getCpuUsage() {
    let cpus = os.cpus();
    let totalLoad = cpus.reduce((acc, cpu) => {
      let total = Object.values(cpu.times).reduce((t, v) => t + v, 0);
      return acc + cpu.times.user / total * 100;
    }, 0);
    return totalLoad / cpus.length;
  }
  getMemoryUsage() {
    return (os.totalmem() - os.freemem()) / os.totalmem() * 100;
  }
  monitorSystem() {
    if (this.checkQueueSize === void 0) throw Error("checkQueueSize is undefined");
    if (this.checkSlaves === void 0) throw Error("checkSlaves is undefined");
    this.checkRequiredFunctions();
    const queueSize = this.checkQueueSize();
    const { idleCount, workingCount } = this.checkSlaves();
    if (idleCount === void 0 || workingCount === void 0)
      throw new Error("checkSlaves function returned idleCount or workingCount with value of undefined");
    const idleRate = idleCount / workingCount + idleCount;
    const queueGrowth = queueSize - this.prevQueueSize;
    this.prevQueueSize = queueSize;
    const avgCpu = this.getCpuUsage();
    const avgMem = this.getMemoryUsage();
    if (
      // if the queue size is passed a threshold: 3
      queueSize > this.queueScaleUpThreshold && // and it is growing
      queueGrowth > 0 && // and the average CPU and MEM usage is below 90%
      avgCpu < this.cpuThreshold && avgMem < this.memThreshold && // and the ratio of idle slaves to working slaves is greater than than threshold
      idleRate < this.maxIdleRateThreshold
    ) {
      log("Scaling up, adding a node");
      this.addSlave();
    }
    if (
      // if the queue size is less than or equal to the threshold
      queueSize <= this.queueScaleDownThreshold && // if there is at least one
      idleCount > 1 && // if the queue size is degreesing or not growing
      queueGrowth <= 0 && // if the idle rate is low
      idleRate > this.minIdleRateThreshold
    ) {
      log("Scaling down, removing a node");
      this.removeSlave();
    }
  }
  startMonitoring() {
    return setInterval(() => {
      this.monitorSystem();
    }, this.checkInterval);
  }
  checkRequiredFunctions() {
    if (this.checkQueueSize === void 0)
      throw new Error("Missing required function checkQueueSize in config");
    if (this.checkSlaves === void 0)
      throw new Error("Missing required function checkSlaves in config");
    if (this.addSlave === void 0)
      throw new Error("Missing required function addSlave in config");
    if (this.removeSlave === void 0)
      throw new Error("Missing required function removeSlave in config");
  }
  exit() {
    clearInterval(this.interval);
  }
}
var ProcessBalancer_default = ProcessBalancer;
export {
  ProcessBalancer_default as default
};
//# sourceMappingURL=ProcessBalancer.js.map