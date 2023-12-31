import Queue from "./Queue.js";
import log from '../utils/log.js';

class Pool {
    /* this class handle the socket connectd
     * queue of sockets and manages connection with the workers
     * */
    constructor() {
        this.enabled = new Queue();
        this.disabled = [];
        this.items = {}
    }

    has( id ) {
        return this.items[id] ? true : false;
    }

    add( id, item ) { 
        // if the item is already in the pool
        if (this.has(id)) this.remove(id);
        // add to the queue
        this.enabled.enqueue(id);
        // add the item to the pool
        this.items[id] = item;
        // return true
        return false;
    }

    disable(id){
        if( !this.has(id) ) return null;
        // if it is in the disable list, job done
        if( this.disabled.indexOf(id) !== -1 ) return true;
        // if it is in the enabled list, remove it
        if( this.enabled.indexOf(id) !== -1 ){
            this.enabled.remove(id);
            // add the slave to the disable list
            this.disabled.push(id);
            return true;
        }
    }

    disableUntil(id, timeOrCondition){
        // if it is not in the pool, return false
        if( !this.has(id) ) return null;
        // check if timeOrCondition is a number or a function
        let time = null;
        let condition = null;
        if(typeof timeOrCondition === 'number')
            time = timeOrCondition;
        else if(typeof timeOrCondition === 'function')
            condition = timeOrCondition;
        else throw new Error('timeOrCondition must be a number or a function');
        // if it is already disabled, we want to keep it disabled until the timeOrCondition is met
        // if it is in the enabled list, disable it
        if( this.enabled.indexOf(id) !== -1 ) this.disable(id);
        // check that the id is in the disabled list
        if( this.disabled.indexOf(id) === -1 ) throw new Error('id is not in the disabled list');
        // if time is defined, set a timeout
        if(time) setTimeout(() => this.enable(id), time);
        // if condition is defined, set a interval
        if(condition){
            let interval = setInterval(() => {
                if(condition()){
                    clearInterval(interval);
                    this.enable(id);
                }
            }, 100);
        }
    }
        

    enable(id){
        // if it is not in the pool, return false
        if( !this.has(id) ) return null;
        // if it is already enabled, job done
        if( this.enabled.indexOf(id) !== -1 ) return true;
        // if it is in the disabled list, remove it
        if( this.disabled.indexOf(id) !== -1 ){
            log('[pool] enabling', id);
            // remove the slave from the disable list
            this.disabled = this.disabled.filter( e => e !== id );
            // add the slave to the queue
            this.enabled.enqueue(id);
            return true
        }
    }

    nextAndEnable(){
        // if the diabled list is empty, return false
        if( this.disabled.length === 0 ) return false;
        // get the first element of the disabled list
        let id = this.disabled[0];
        // and enable it
        this.enable(id);
        // return the id
        return id;
    }

    rotate() { // dequeue and enqueue
        if(this.size() === 0) return null
        const id = this.enabled.dequeue()
        if(!id) return null
        this.enabled.enqueue(id)
        return this.items[id]
    }

    next(){
        return this.rotate();
    }

    nextAndDisable() { // dequeue and disable
        if(this.size() === 0) return null
        const id = this.enabled.dequeue();
        if(!id) return null
        this.disabled.push(id);
        return this.items[id];
    }

    // remove value while maintaining order
    remove( id ) {
        // look in the queue for the id
        let result = this._lookUp(id);
        if(result){
            let index = result.index;
            let list = result.list;
            // remove the lists
            if(list === 'enabled')
                this.enabled.removeAt(index);
            else
                this.disabled.splice(index, 1);
            // remove the items
            let item = this.items[id];
            delete this.items[id];
            // return true
            return item;
        }
        return false;
    }

    get( id ) {
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

    // check if queue is empty
    isEmpty() {
        return this.size() === 0;
    }

    _lookUp( id ) {
        // look in the queue for the id
        let index = this.enabled.indexOf(id);
        if(!(index === -1))
            return { index, list: 'enabled' };
        
        // look in the disable list for the id
        index = this.disabled.indexOf(id);
        if(!(index === -1))
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

    getDisabled() {
        return this.disabled;
    }

    getConnections() {
        return Object.keys(this.items);
    }

    healthCheck() {
        let totalConnections = this.size();
        let enabledConnections = this.getEnabled().length;
        let disabledConnections = this.getDisabled().length;
        if(totalConnections === (enabledConnections + disabledConnections))
            return true;
        else return false;
    }

}

export default Pool;
