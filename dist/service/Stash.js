import {
  __publicField
} from "../chunk-V6TY7KAL.js";
class Stash {
  constructor() {
    __publicField(this, "store", /* @__PURE__ */ new Map());
    __publicField(this, "queue", Promise.resolve());
  }
  /**
   * Internal method to serialize and validate JSON-serializable object
   */
  validateSerializable(value) {
    try {
      JSON.stringify(value);
    } catch (err) {
      throw new Error("Value must be JSON-serializable.");
    }
  }
  /**
   * Internal lock function to queue up tasks
   */
  async withLock(fn) {
    let release;
    const next = new Promise((resolve) => release = resolve);
    const prev = this.queue;
    this.queue = next;
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }
  async set(key, value) {
    if (value === void 0 || value === null) {
      value = key;
      key = "_default";
    }
    return this.withLock(async () => {
      this.store.set(key, value);
    });
  }
  async get(key) {
    if (key === void 0 || key === null || key === "")
      key = "_default";
    return this.withLock(async () => {
      return this.store.get(key);
    });
  }
  async delete(key) {
    if (key === void 0 || key === null || key === "")
      key = "_default";
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
    if (key === void 0 || key === null || key === "")
      key = "_default";
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
var Stash_default = Stash;
export {
  Stash_default as default
};
//# sourceMappingURL=Stash.js.map