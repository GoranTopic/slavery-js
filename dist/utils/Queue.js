"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Queue {
    items = [];
    constructor(items = []) {
        if (items.length > 0)
            this.items = items;
        else
            this.items = [];
    }
    enqueue(item) {
        // push item to the end of the queue
        this.items.push(item);
        return true;
    }
    dequeue() {
        // remove item from the beginning of the queue
        if (this.items.length > 0) {
            const item = this.items.shift();
            if (item === undefined)
                return false;
            return item;
        }
        return false;
    }
    next() {
        // dequeue and enqueue
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
        }
        else {
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
        }
        else {
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
    // clear the queue
    clear = () => this.items = [];
    // synonyms
    pop = this.dequeue;
    push = this.enqueue;
    shift = this.dequeue;
    unshift = this.enqueue;
    front = this.peek;
    end = this.next;
}
exports.default = Queue;
//# sourceMappingURL=Queue.js.map