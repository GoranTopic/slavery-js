import {
  __publicField
} from "../chunk-V6TY7KAL.js";
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
export {
  Queue_default as default
};
//# sourceMappingURL=Queue.js.map