import os from 'os';

interface balancerConfig {
    minSlaves?: number;
    maxSlaves?: number;
    scaleUpThreshold?: number;
    scaleDownThreshold?: number;
    cpuThreshold?: number;
    memThreshold?: number;
    checkInterval?: number;
    checkQueueSize: () => number;
    addSlave: () => void;
    removeSlave: () => void;
}

class ProcessBalancer {
    private idleSlaves: number = 0;
    private prevQueueSize: number = 0;

    private scaleUpThreshold: number;
    private scaleDownThreshold: number;
    private cpuThreshold: number;
    private memThreshold: number;
    private checkInterval: number;
    private checkQueueSize: () => number;
    private addSlave: () => void;
    private removeSlave: () => void;

    constructor(config: balancerConfig) {
        this.scaleUpThreshold = config.scaleUpThreshold || 5;
        this.scaleDownThreshold = config.scaleDownThreshold || 1;
        this.cpuThreshold = config.cpuThreshold || 90;
        this.memThreshold = config.memThreshold || 90;
        this.checkInterval = config.checkInterval || 5000;
        this.checkQueueSize = config.checkQueueSize;
        this.addSlave = config.addSlave;
        this.removeSlave = config.removeSlave;
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
        const queueSize = this.checkQueueSize();
        const queueGrowth = queueSize - this.prevQueueSize;
        this.prevQueueSize = queueSize;
        const avgCpu = this.getCpuUsage();
        const avgMem = this.getMemoryUsage();

        console.log(
            `Queue Size: ${queueSize}, Growth: ${queueGrowth}, CPU: ${avgCpu.toFixed(2)}%, MEM: ${avgMem.toFixed(2)}%, Idle Slaves: ${this.idleSlaves}`
        );

        // if queue size is growing, CPU and MEM are below threshold, and we have idle slaves
        if ( 
            queueSize > this.scaleUpThreshold &&
            queueGrowth > 0 &&
            avgCpu < this.cpuThreshold &&
            avgMem < this.memThreshold
        ) {
            this.addSlave();
        }

        if (
            queueSize < this.scaleDownThreshold &&
            this.idleSlaves > 1 &&
            queueGrowth <= 0
        ) {
            this.removeSlave();
        }
    }

    private startMonitoring(): void {
        setInterval(() => {
            this.monitorSystem();
        }, this.checkInterval);
    }
}

export default ProcessBalancer;
