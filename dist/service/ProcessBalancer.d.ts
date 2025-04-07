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
    checkSlaves: (() => {
        idleCount: number | undefined;
        workingCount: number | undefined;
    }) | undefined;
    checkQueueSize: (() => number) | undefined;
    addSlave: (() => void) | undefined;
    removeSlave: (() => void) | undefined;
}
declare class ProcessBalancer {
    private prevQueueSize;
    private interval;
    private queueScaleUpThreshold;
    private queueScaleDownThreshold;
    private maxIdleRateThreshold;
    private minIdleRateThreshold;
    private cpuThreshold;
    private memThreshold;
    private checkInterval;
    private checkQueueSize;
    private checkSlaves;
    private addSlave;
    private removeSlave;
    constructor(config: balancerConfig);
    private getCpuUsage;
    private getMemoryUsage;
    private monitorSystem;
    private startMonitoring;
    private checkRequiredFunctions;
    exit(): void;
}

export { ProcessBalancer as default };
