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
        console.log('target',target)
        // this will take
        return (args: any) => {
            console.log(`method: ${prop}`)
            // type of args
            console.log(typeof args)
            if (typeof args === 'function') {
                console.log('args is a function')
                // call the callback
                callback(prop, args.name, args)
                return proxy;
            } else {
                console.log('args is not a function')
                // call the callback
                callback(prop, args, args)
            }
            //to string
            let strs = args.map( (arg:any) => arg.toString())
            console.log(`arguments:`)
            console.log(strs)
            return proxy;
        };
    }
});

export default makeProxyObject;

