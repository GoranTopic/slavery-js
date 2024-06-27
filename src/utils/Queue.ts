class Queue<T> {
    private items: T[];

    constructor() {
        this.items = []
    }
    
    enqueue(item: T) {
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

    next(): T | false {
        // dequeue and enqueue
        if(this.items.length > 0) {
            const item = this.items.shift()
            if(item) {
                this.items.push(item)
                return item
            }
        }
        return false;
    }
    
    // remove value while maintaining order
    removeAt( index: number) : T | false {
        if (index > -1 && index < this.items.length) {
            return this.items.splice(index, 1)[0];
        }else {
            return false;
        }
    }

    indexOf(item: T) : number {
        return this.items.indexOf(item);
    }

    remove(item: T) : T | false {
        const index = this.items.indexOf(item);
        if (index > -1) {
            return this.items.splice(index, 1)[0];
        }else {
            return false;
        }
    }

    peek(): T | false {
        return this.items[0]
    }

    printQueue() : T[] {
        return this.items;
    }

    // return array of items in the order they were added
    toArray() : T[] {
        return this.items;
    }

    // return object of items in the order they were added
    toObject() : object {
        let obj: { [key: string]: T } = {}; 
        this.items.forEach( (item, index) => {
            obj[index] = item;
        });
        return obj;
    }

    // get the size of the queue
    size() : number {
        return this.items.length;
    }

    // lenght of the queue
    length() : number {
        return this.items.length;
    }

    // check if queue is empty
    isEmpty() : boolean {
        return this.items.length === 0;
    }
}

export default Queue;
