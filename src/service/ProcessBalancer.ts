import os from 'os';
import { log } from '../utils';

interface balancerConfig {
    minSlaves?: number;
    maxSlaves?: number;
    queueScaleUpThreshold?: number;
    queueScaleDownThreshold?: number;
    maxIdleRateThreshold?: number;
    minIdleRateThreshold?: number;
    cpuThreshold?: number;
    memThreshold?: number;
    checkInterval?: number;
    checkSlaves: (() => { idleCount: number | undefined, workingCount:number | undefined }) | undefined;
    checkQueueSize: (() => number) | undefined;
    addSlave: (() => void) | undefined;
    removeSlave: (() => void) | undefined;
}

class ProcessBalancer {
    private idleSlaves: number = 0;
    private prevQueueSize: number = 0;

    private queueScaleUpThreshold: number;
    private queueScaleDownThreshold: number;
    private maxIdleRateThreshold: number;
    private minIdleRateThreshold: number;
    private cpuThreshold: number;
    private memThreshold: number;
    private checkInterval: number;
    private checkQueueSize: (() => number) | undefined;
    private checkSlaves: (() => { idleCount: number | undefined, workingCount:number | undefined }) | undefined;
    private addSlave: (() => void) | undefined;
    private removeSlave: (() => void) | undefined;

    constructor(config: balancerConfig) {
        // if there is at least 3 request in the queue, allow to scale up
        this.queueScaleUpThreshold = config.queueScaleUpThreshold || 3;
        // if there is at most one request on the queue, allow to scale down
        this.queueScaleDownThreshold = config.queueScaleDownThreshold || 0;
        // if we are using a lot of resources, don't scale up
        this.cpuThreshold = config.cpuThreshold || 90;
        this.memThreshold = config.memThreshold || 90;
        // if 80 percent of all slaves are idle, don't allow to make more
        this.maxIdleRateThreshold = config.maxIdleRateThreshold || 0.8
        // if 10 percent of all slaves are idle, don't remove any
        this.minIdleRateThreshold = config.minIdleRateThreshold || 0.1
        // how often do we check
        this.checkInterval = config.checkInterval || 500;
        // function need to check
        this.checkQueueSize = config.checkQueueSize;
        this.checkSlaves = config.checkSlaves;
        this.addSlave = config.addSlave;
        this.removeSlave = config.removeSlave;
        // check if we got all the need callbacks
        this.checkRequiredFunctions();
        // Initialize monitoring
        this.startMonitoring();
    }

    private getCpuUsage(): number {
        let cpus = os.cpus();
        let totalLoad = cpus.reduce((acc, cpu) => {
            let total = Object.values(cpu.times).reduce((t, v) => t + v, 0);
            return acc + (cpu.times.user / total) * 100;
        }, 0);
        return totalLoad / cpus.length;
    }

    private getMemoryUsage(): number {
        return ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
    }

    private monitorSystem(): void {
        if(this.checkQueueSize === undefined) throw Error('checkQueueSize is undefined');
        if(this.checkSlaves === undefined) throw Error('checkSlaves is undefined');

        this.checkRequiredFunctions();
        const queueSize = this.checkQueueSize();
        const { idleCount, workingCount } = this.checkSlaves();
        if(idleCount === undefined || workingCount === undefined)
            throw new Error('checkSlaves function returned idleCount or workingCount with value of undefined')
        const idleRate = idleCount / workingCount + idleCount
        const queueGrowth = queueSize - this.prevQueueSize;
        this.prevQueueSize = queueSize;
        const avgCpu = this.getCpuUsage();
        const avgMem = this.getMemoryUsage();

        console.log(`
            Queue Size: ${queueSize},
            Growth: ${queueGrowth},
            CPU: ${avgCpu.toFixed(2)}%,
            MEM: ${avgMem.toFixed(2)}%,
            Idle Slaves: ${idleCount},
            Working Slaves: ${workingCount},
            Total Slaves: ${idleCount + workingCount},
            Idle Ratio: ${(idleCount / workingCount).toFixed(2)}`
           );

           if (
               // if the queue size is passed a threshold: 3
               queueSize > this.queueScaleUpThreshold &&
               // and it is growing
               queueGrowth > 0 &&
               // and the average CPU and MEM usage is below 90%
               avgCpu < this.cpuThreshold &&
               avgMem < this.memThreshold &&
               // and the ratio of idle slaves to working slaves is greater than than threshold
               idleRate < this.maxIdleRateThreshold
           ){
               console.log('Adding Slave!');
               //@ts-ignore
               this.addSlave();
           }
           if ( // if the queue size is less than or equal to the threshold
               queueSize <= this.queueScaleDownThreshold &&
               // if there is at least one
               idleCount > 1 &&
               // if the queue size is degreesing or not growing
               queueGrowth <= 0 &&
               // if the idle rate is low
               idleRate > this.minIdleRateThreshold
              ){
                  console.log('Removing Slave!');
                  //@ts-ignore
                  this.removeSlave();
              }
    }

    private startMonitoring(): void {
        setInterval(() => {
            this.monitorSystem();
        }, this.checkInterval);
    }

    private checkRequiredFunctions(): void {
        if (this.checkQueueSize === undefined)
            throw new Error('Missing required function checkQueueSize in config');
        if (this.checkSlaves === undefined)
            throw new Error('Missing required function checkSlaves in config');
        if (this.addSlave === undefined)
            throw new Error('Missing required function addSlave in config');
        if (this.removeSlave === undefined)
            throw new Error('Missing required function removeSlave in config');
    }
}

export default ProcessBalancer;
