"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Queue_js_1 = __importDefault(require("./Queue.js"));
class Pool {
    /* *
     * this class handle the socket connectd
     * queue of sockets and manages connection with the workers
     * */
    enabled;
    disabled;
    items;
    constructor() {
        this.enabled = new Queue_js_1.default();
        this.disabled = [];
        this.items = {};
    }
    has(id) {
        return this.items[id] ? true : false;
    }
    add(id, item) {
        // if the item is already in the pool
        if (this.has(id))
            this.remove(id);
        // add to the queue
        this.enabled.enqueue(id);
        // add the item to the pool
        this.items[id] = item;
        // return true
        return false;
    }
    disable(id) {
        if (!this.has(id))
            return false;
        // if it is in the disable list, job done
        if (this.disabled.indexOf(id) !== -1)
            return true;
        // if it is in the enabled list, remove it
        if (this.enabled.indexOf(id) !== -1) {
            this.enabled.remove(id);
            // add the slave to the disable list
            this.disabled.push(id);
            return true;
        }
        return false;
    }
    disableUntil(id, timeOrCondition) {
        // if it is not in the pool, return false
        if (!this.has(id))
            return;
        // check if timeOrCondition is a number or a function
        let time = null;
        let condition = null;
        if (typeof timeOrCondition === 'number')
            time = timeOrCondition;
        else if (typeof timeOrCondition === 'function')
            condition = timeOrCondition;
        else
            throw new Error('timeOrCondition must be a number or a function');
        // if it is already disabled, we want to keep it disabled until the timeOrCondition is met
        // if it is in the enabled list, disable it
        if (this.enabled.indexOf(id) !== -1)
            this.disable(id);
        // check that the id is in the disabled list
        if (this.disabled.indexOf(id) === -1)
            throw new Error('id is not in the disabled list');
        // if time is defined, set a timeout
        if (time)
            setTimeout(() => this.enable(id), time);
        // if condition is defined, set a interval
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
        // if it is not in the pool, return false
        if (!this.has(id))
            return false;
        // if it is already enabled, job done
        if (this.enabled.indexOf(id) !== -1)
            return true;
        // if it is in the disabled list, remove it
        if (this.disabled.indexOf(id) !== -1) {
            // remove the slave from the disable list
            this.disabled = this.disabled.filter(e => e !== id);
            // add the slave to the queue
            this.enabled.enqueue(id);
            return true;
        }
        return false;
    }
    nextAndEnable() {
        // if the diabled list is empty, return false
        if (this.disabled.length === 0)
            return false;
        // get the first element of the disabled list
        let id = this.disabled[0];
        // and enable it
        this.enable(id);
        // return the id
        return id;
    }
    rotate() {
        // dequeue and enqueue
        if (this.size() === 0)
            return null;
        const id = this.enabled.dequeue();
        if (!id)
            return null;
        this.enabled.enqueue(id);
        return this.items[id];
    }
    hasEnabled() {
        return this.enabled.size() > 0;
    }
    nextAndDisable() {
        if (this.size() === 0)
            return null;
        const id = this.enabled.dequeue();
        if (!id)
            return null;
        this.disabled.push(id);
        return this.items[id];
    }
    // remove value while maintaining order
    remove(id) {
        // look in the queue for the id
        let result = this._lookUp(id);
        if (result) {
            let index = result.index;
            let list = result.list;
            // remove the lists
            if (list === 'enabled')
                this.enabled.removeAt(index);
            else
                this.disabled.splice(index, 1);
            // remove the items
            let item = this.items[id];
            delete this.items[id];
            // return true
            return item;
        }
        return null;
    }
    removeOne() {
        // get the first element of the enabled list
        if (this.enabled.size() > 0) {
            let id = this.enabled.dequeue();
            if (id === undefined || id === false)
                return null;
            // remove the item from the pool
            let item = this.items[id];
            delete this.items[id];
            return item;
        }
        return null;
    }
    get(id) {
        /* get the item from the pool */
        if (!this.has(id))
            return null;
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
        // look in the queue for the id
        let index = this.enabled.indexOf(id);
        if (!(index === -1))
            return { index, list: 'enabled' };
        // look in the disable list for the id
        index = this.disabled.indexOf(id);
        if (!(index === -1))
            return { index, list: 'disabled' };
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
        return this.enabled.toArray().map(id => this.items[id]);
    }
    getDisabled() {
        return this.disabled;
    }
    getDisabledObjects() {
        return this.disabled.map(id => this.items[id]);
    }
    getConnections() {
        return Object.keys(this.items);
    }
    healthCheck() {
        let total = this.size();
        let enabled = this.getEnabled().length;
        let disabled = this.getDisabled().length;
        if (total === (enabled + disabled))
            return true;
        else
            return false;
    }
    // synonims
    next = this.rotate;
    pop = this.nextAndDisable;
    shift = this.nextAndEnable;
    unshift = this.add;
    push = this.add;
    count = this.size;
    removeAt = this.remove;
    removeItem = this.remove;
}
exports.default = Pool;
//# sourceMappingURL=Pool.js.map