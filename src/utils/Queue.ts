class Queue {
    private items: any[];

    constructor() {
        this.items = []
    }
    
    enqueue(item: any) {
        // push item to the end of the queue
        this.items.push(item)
        return true;
    }

    dequeue() {
        // remove item from the beginning of the queue
        if(this.items.length > 0) {
            return this.items.shift()
        }
        return false;
    }

    next() {
        // dequeue and enqueue
        if(this.items.length > 0) {
            const item = this.items.shift()
            this.items.push(item)
            return item
        }
    }
    
    // remove value while maintaining order
    removeAt( index: number) {
        if (index > -1 && index < this.items.length) {
            return this.items.splice(index, 1)[0];
        }else {
            return false;
        }
    }

    indexOf(item: any) {
        return this.items.indexOf(item);
    }

    remove(item: any) {
        const index = this.items.indexOf(item);
        if (index > -1) {
            return this.items.splice(index, 1)[0];
        }else {
            return false;
        }
    }

    peek() {
        return this.items[0]
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
        this.items.forEach( (item, index) => {
            //@ts-ignore
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

export default Queue;
