declare class Pool<T> {
    private enabled;
    private disabled;
    private items;
    constructor();
    has(id: string): boolean;
    add(id: string, item: T): boolean;
    disable(id: string): boolean;
    disableUntil(id: string, timeOrCondition: number | Function): undefined;
    enable(id: string): boolean;
    nextAndEnable(): string | boolean;
    rotate(): T | null;
    hasEnabled(): boolean;
    nextAndDisable(): T | null;
    remove(id: string): T | null;
    removeOne(): T | null;
    get(id: string): T | null;
    size(): number;
    length(): number;
    getEnabledCount(): number;
    getDisabledCount(): number;
    isEmpty(): boolean;
    _lookUp(id: string): {
        index: number;
        list: string;
    } | false;
    toArray(): T[];
    print(): void;
    getEnabled(): string[];
    getEnabledObjects(): T[];
    getDisabled(): string[];
    getDisabledObjects(): T[];
    getConnections(): string[];
    healthCheck(): boolean;
    next: () => T | null;
    pop: () => T | null;
    shift: () => string | boolean;
    unshift: (id: string, item: T) => boolean;
    push: (id: string, item: T) => boolean;
    count: () => number;
    removeAt: (id: string) => T | null;
    removeItem: (id: string) => T | null;
}

export { Pool as default };
