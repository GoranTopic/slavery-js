import { log } from '../utils/index.js';

type StashItem = any;

class Stash {
    private store: Map<string, StashItem> = new Map();
    private queue: Promise<void> = Promise.resolve();

    /**
     * Internal method to serialize and validate JSON-serializable object
     */
    private validateSerializable(value: StashItem): void {
        // since we are using socket.io, there is no need
        try {
            JSON.stringify(value);
        } catch (err) {
            throw new Error("Value must be JSON-serializable.");
        }
    }

    /**
     * Internal lock function to queue up tasks
     */
    private async withLock<T>(fn: () => Promise<T>): Promise<T> {
        let release: () => void;
        const next = new Promise<void>(resolve => (release = resolve));

        const prev = this.queue;
        this.queue = next;

        try {
            await prev;
        } catch (error) {
            log('[Stash] Error waiting for previous operation: ' + error);
            // Continue execution even if previous operation failed
        }

        try {
            return await fn();
        } catch (error) {
            log('[Stash] Error in withLock operation: ' + error);
            throw error;
        } finally {
            release!();
        }
    }

    async set(key: string, value: StashItem): Promise<void> {
        // if now key is pass assume a defualt key
        if(value === undefined || value === null) {
            value = key;
            key = '_default';
        }
        //this.validateSerializable(value);
        return this.withLock(async () => {
            this.store.set(key, value);
        });
    }

    async get<T = StashItem>(key: string): Promise<T | undefined> {
        if(key === undefined || key === null || key === '')
            key = '_default';
        return this.withLock(async () => {
            return this.store.get(key);
        });
    }

    async delete(key: string): Promise<void> {
        if(key === undefined || key === null || key === '')
            key = '_default';
        return this.withLock(async () => {
            this.store.delete(key);
        });
    }

    async clear(): Promise<void> {
        return this.withLock(async () => {
            this.store.clear();
        });
    }

    async has(key: string): Promise<boolean> {
        if(key === undefined || key === null || key === '')
            key = '_default';
        return this.withLock(async () => {
            return this.store.has(key);
        });
    }

    async keys(): Promise<string[]> {
        return this.withLock(async () => {
            return Array.from(this.store.keys());
        });
    }
}

export default Stash;
