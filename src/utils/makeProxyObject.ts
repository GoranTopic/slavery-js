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

type proxyObjectCallback = (methodCalled: string, functionCalled: string, object: any) => void;

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
        return (args: any, args2: any) => {
            let method = prop;
            let methodFn = args;
            let options;
            // get the callback from the function
            if(typeof args === undefined) 
                throw new Error('No parameters passed')
            else if (typeof args !== 'function') 
                throw new Error('first paramter must be a function')
            methodFn = args.toString();
            // get the options object
            if(args2 !== undefined) {
                if(typeof args2 !== 'object') 
                    throw new Error('second parameter must be an object')
                options = args2;
            }
            // run the passed callback
            console.log('method:', method)
            console.log('methodFn:', methodFn)
            console.log('options:', options)
            callback(method, methodFn, options);
            // return the proxy object
            return proxy;
        };
    }
});


export default makeProxyObject;
