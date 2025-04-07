declare class Queue<T> {
    private items;
    constructor(items?: T[]);
    enqueue(item: T): boolean;
    dequeue(): T | false;
    next(): T | false;
    removeAt(index: number): T | false;
    indexOf(item: T): number;
    remove(item: T): T | false;
    peek(): T | false;
    printQueue(): T[];
    toArray(): T[];
    toObject(): object;
    size(): number;
    length(): number;
    isEmpty(): boolean;
    clear: () => never[];
    pop: () => T | false;
    push: (item: T) => boolean;
    shift: () => T | false;
    unshift: (item: T) => boolean;
    front: () => T | false;
    end: () => T | false;
}

export { Queue as default };
