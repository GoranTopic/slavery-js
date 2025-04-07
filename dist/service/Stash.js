class Stash {
    store = new Map();
    queue = Promise.resolve();
    /**
     * Internal method to serialize and validate JSON-serializable object
     */
    validateSerializable(value) {
        // since we are using socket.io, there is no need
        try {
            JSON.stringify(value);
        }
        catch (err) {
            throw new Error("Value must be JSON-serializable.");
        }
    }
    /**
     * Internal lock function to queue up tasks
     */
    async withLock(fn) {
        let release;
        const next = new Promise(resolve => (release = resolve));
        const prev = this.queue;
        this.queue = next;
        await prev;
        try {
            return await fn();
        }
        finally {
            release();
        }
    }
    async set(key, value) {
        // if now key is pass assume a defualt key
        if (value === undefined || value === null) {
            value = key;
            key = '_default';
        }
        //this.validateSerializable(value);
        return this.withLock(async () => {
            this.store.set(key, value);
        });
    }
    async get(key) {
        if (key === undefined || key === null || key === '')
            key = '_default';
        return this.withLock(async () => {
            return this.store.get(key);
        });
    }
    async delete(key) {
        if (key === undefined || key === null || key === '')
            key = '_default';
        return this.withLock(async () => {
            this.store.delete(key);
        });
    }
    async clear() {
        return this.withLock(async () => {
            this.store.clear();
        });
    }
    async has(key) {
        if (key === undefined || key === null || key === '')
            key = '_default';
        return this.withLock(async () => {
            return this.store.has(key);
        });
    }
    async keys() {
        return this.withLock(async () => {
            return Array.from(this.store.keys());
        });
    }
}
export default Stash;
//# sourceMappingURL=Stash.js.map