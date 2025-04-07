import {
  __publicField
} from "../chunk-V6TY7KAL.js";
import Queue from "./Queue.js";
class Pool {
  constructor() {
    /* *
     * this class handle the socket connectd
     * queue of sockets and manages connection with the workers
     * */
    __publicField(this, "enabled");
    __publicField(this, "disabled");
    __publicField(this, "items");
    // synonims
    __publicField(this, "next", this.rotate);
    __publicField(this, "pop", this.nextAndDisable);
    __publicField(this, "shift", this.nextAndEnable);
    __publicField(this, "unshift", this.add);
    __publicField(this, "push", this.add);
    __publicField(this, "count", this.size);
    __publicField(this, "removeAt", this.remove);
    __publicField(this, "removeItem", this.remove);
    this.enabled = new Queue();
    this.disabled = [];
    this.items = {};
  }
  has(id) {
    return this.items[id] ? true : false;
  }
  add(id, item) {
    if (this.has(id)) this.remove(id);
    this.enabled.enqueue(id);
    this.items[id] = item;
    return false;
  }
  disable(id) {
    if (!this.has(id)) return false;
    if (this.disabled.indexOf(id) !== -1) return true;
    if (this.enabled.indexOf(id) !== -1) {
      this.enabled.remove(id);
      this.disabled.push(id);
      return true;
    }
    return false;
  }
  disableUntil(id, timeOrCondition) {
    if (!this.has(id)) return;
    let time = null;
    let condition = null;
    if (typeof timeOrCondition === "number")
      time = timeOrCondition;
    else if (typeof timeOrCondition === "function")
      condition = timeOrCondition;
    else throw new Error("timeOrCondition must be a number or a function");
    if (this.enabled.indexOf(id) !== -1) this.disable(id);
    if (this.disabled.indexOf(id) === -1) throw new Error("id is not in the disabled list");
    if (time) setTimeout(() => this.enable(id), time);
    if (condition) {
      let interval = setInterval(() => {
        if (condition()) {
          clearInterval(interval);
          this.enable(id);
        }
      }, 100);
    }
  }
  enable(id) {
    if (!this.has(id)) return false;
    if (this.enabled.indexOf(id) !== -1) return true;
    if (this.disabled.indexOf(id) !== -1) {
      this.disabled = this.disabled.filter((e) => e !== id);
      this.enabled.enqueue(id);
      return true;
    }
    return false;
  }
  nextAndEnable() {
    if (this.disabled.length === 0) return false;
    let id = this.disabled[0];
    this.enable(id);
    return id;
  }
  rotate() {
    if (this.size() === 0) return null;
    const id = this.enabled.dequeue();
    if (!id) return null;
    this.enabled.enqueue(id);
    return this.items[id];
  }
  hasEnabled() {
    return this.enabled.size() > 0;
  }
  nextAndDisable() {
    if (this.size() === 0) return null;
    const id = this.enabled.dequeue();
    if (!id) return null;
    this.disabled.push(id);
    return this.items[id];
  }
  // remove value while maintaining order
  remove(id) {
    let result = this._lookUp(id);
    if (result) {
      let index = result.index;
      let list = result.list;
      if (list === "enabled")
        this.enabled.removeAt(index);
      else
        this.disabled.splice(index, 1);
      let item = this.items[id];
      delete this.items[id];
      return item;
    }
    return null;
  }
  removeOne() {
    if (this.enabled.size() > 0) {
      let id = this.enabled.dequeue();
      if (id === void 0 || id === false) return null;
      let item = this.items[id];
      delete this.items[id];
      return item;
    }
    return null;
  }
  get(id) {
    if (!this.has(id)) return null;
    return this.items[id];
  }
  // get the size of the pool
  size() {
    return Object.keys(this.items).length;
  }
  // lenght of the pool
  length() {
    return this.size();
  }
  // count the enabled elements
  getEnabledCount() {
    return this.enabled.size();
  }
  // count the disabled elements
  getDisabledCount() {
    return this.disabled.length;
  }
  // check if queue is empty
  isEmpty() {
    return this.size() === 0;
  }
  _lookUp(id) {
    let index = this.enabled.indexOf(id);
    if (!(index === -1))
      return { index, list: "enabled" };
    index = this.disabled.indexOf(id);
    if (!(index === -1))
      return { index, list: "disabled" };
    return false;
  }
  toArray() {
    return Object.values(this.items);
  }
  print() {
    console.log(this.toArray());
  }
  getEnabled() {
    return this.enabled.toArray();
  }
  getEnabledObjects() {
    return this.enabled.toArray().map((id) => this.items[id]);
  }
  getDisabled() {
    return this.disabled;
  }
  getDisabledObjects() {
    return this.disabled.map((id) => this.items[id]);
  }
  getConnections() {
    return Object.keys(this.items);
  }
  healthCheck() {
    let total = this.size();
    let enabled = this.getEnabled().length;
    let disabled = this.getDisabled().length;
    if (total === enabled + disabled)
      return true;
    else return false;
  }
}
var Pool_default = Pool;
export {
  Pool_default as default
};
//# sourceMappingURL=Pool.js.map