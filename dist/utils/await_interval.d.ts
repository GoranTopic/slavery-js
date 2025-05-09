type awaitIntervalOptions = {
    condition: () => any;
    timeout?: number;
    interval?: number;
    error?: string;
};
declare function interval_await({ condition, timeout, interval, error }: awaitIntervalOptions): Promise<any>;

export { interval_await as default };
