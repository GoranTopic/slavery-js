"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var Stash_exports = {};
__export(Stash_exports, {
  default: () => Stash_default
});
module.exports = __toCommonJS(Stash_exports);
var import_utils = require("../utils/index.js");
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
    try {
      await prev;
    } catch (error) {
      (0, import_utils.log)("[Stash] Error waiting for previous operation: " + error);
    }
    try {
      return await fn();
    } catch (error) {
      (0, import_utils.log)("[Stash] Error in withLock operation: " + error);
      throw error;
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
//# sourceMappingURL=Stash.cjs.map