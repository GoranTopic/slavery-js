"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
let proxy;
const makeProxyObject = (callback) => {
    // Create a proxy object handler the given callbakcs
    const proxyObjecHandler = makeProxyObjecHandler(callback);
    proxy = new Proxy({}, proxyObjecHandler);
    return proxy;
};
const makeProxyObjecHandler = (callback) => ({
    get(target, prop) {
        // this will take
        return (args, args2, args3) => {
            let method = prop;
            let param1 = args;
            let param2 = args2;
            let param3 = args3;
            // if the first argument not a function or an object
            if (typeof args !== 'function' && typeof args !== 'object')
                throw new Error('first parameter must be a function or an object');
            if (args2 !== undefined && typeof args2 !== 'object')
                throw new Error('second parameter must be an object');
            if (args3 !== undefined && typeof args3 !== 'object')
                throw new Error('third parameter must be an object');
            // run the passed callback
            callback(method, param1, param2, param3);
            // return the proxy object
            return proxy;
        };
    }
});
exports.default = makeProxyObject;
//# sourceMappingURL=makeProxyObject.js.map