/* 
 * this code will serve as the entry point for the applacation
 * it allows the api to have a syntax of:
 *
 * proxy
 *  .master( (master) => {
 *      console.log(master)
 *      console.log('some function')
 *  })
 *  .slave( slave => {
 *      console.log('something else', slave)
 *  }, 9090, 'someArgString')
 *  .yetAnotherMethod();
 */


/*  this function will make the proxy object which takes a callback
 *  and returns a proxy object
 *  @param {function} callback - the callback to be called
 */

// this is a promise 
type proxyObjectCallback =  (methodCalled: string, param1: any, param2?: any, param3?: any) => void | Promise<void>;

let proxy: ProxyConstructor;

const makeProxyObject = (callback: proxyObjectCallback) => {
    // Create a proxy object handler the given callbakcs
    const proxyObjecHandler = makeProxyObjecHandler(callback);
    proxy = new Proxy({}, proxyObjecHandler);
    return proxy;
}

const makeProxyObjecHandler = (callback: proxyObjectCallback) => ({
    get(target: any, prop: any) {
        // this will take
        return (args: any, args2?: any, args3?: any) => {
            let method = prop;
            let param1 = args;
            let param2 = args2;
            let param3 = args3;
            // if the first argument not a function or an object
            if(typeof args !== 'function' && typeof args !== 'object')
                throw new Error('first parameter must be a function or an object')
            if(args2 !== undefined && typeof args2 !== 'object') 
                throw new Error('second parameter must be an object')
            if(args3 !== undefined && typeof args3 !== 'object')
                throw new Error('third parameter must be an object')
            // run the passed callback
            callback(method, param1, param2, param3);
            // return the proxy object
            return proxy;
        };
    }
});

export default makeProxyObject;
