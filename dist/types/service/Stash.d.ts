type StashItem = any;
declare class Stash {
    private store;
    private queue;
    /**
     * Internal method to serialize and validate JSON-serializable object
     */
    private validateSerializable;
    /**
     * Internal lock function to queue up tasks
     */
    private withLock;
    set(key: string, value: StashItem): Promise<void>;
    get<T = StashItem>(key: string): Promise<T | undefined>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
    keys(): Promise<string[]>;
}
export default Stash;
