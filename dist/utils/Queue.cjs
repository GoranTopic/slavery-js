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
var Queue_exports = {};
__export(Queue_exports, {
  default: () => Queue_default
});
module.exports = __toCommonJS(Queue_exports);
class Queue {
  constructor(items = []) {
    __publicField(this, "items", []);
    // clear the queue
    __publicField(this, "clear", () => this.items = []);
    // synonyms
    __publicField(this, "pop", this.dequeue);
    __publicField(this, "push", this.enqueue);
    __publicField(this, "shift", this.dequeue);
    __publicField(this, "unshift", this.enqueue);
    __publicField(this, "front", this.peek);
    __publicField(this, "end", this.next);
    if (items.length > 0)
      this.items = items;
    else
      this.items = [];
  }
  enqueue(item) {
    this.items.push(item);
    return true;
  }
  dequeue() {
    if (this.items.length > 0) {
      const item = this.items.shift();
      if (item === void 0) return false;
      return item;
    }
    return false;
  }
  next() {
    if (this.items.length > 0) {
      const item = this.items.shift();
      if (item) {
        this.items.push(item);
        return item;
      }
    }
    return false;
  }
  // remove value while maintaining order
  removeAt(index) {
    if (index > -1 && index < this.items.length) {
      return this.items.splice(index, 1)[0];
    } else {
      return false;
    }
  }
  indexOf(item) {
    return this.items.indexOf(item);
  }
  remove(item) {
    const index = this.items.indexOf(item);
    if (index > -1) {
      return this.items.splice(index, 1)[0];
    } else {
      return false;
    }
  }
  peek() {
    return this.items[0];
  }
  printQueue() {
    return this.items;
  }
  // return array of items in the order they were added
  toArray() {
    return this.items;
  }
  // return object of items in the order they were added
  toObject() {
    let obj = {};
    this.items.forEach((item, index) => {
      obj[index] = item;
    });
    return obj;
  }
  // get the size of the queue
  size() {
    return this.items.length;
  }
  // lenght of the queue
  length() {
    return this.items.length;
  }
  // check if queue is empty
  isEmpty() {
    return this.items.length === 0;
  }
}
var Queue_default = Queue;
//# sourceMappingURL=Queue.cjs.map