const proxyObjecHandler = {
    get(target, prop) {
        // this will take
        return (args, args2) => {
            let method = prop;
            let callback;
            let options;
            // get the callback from the function
            if(typeof args === undefined) 
                throw new Error('No parameters passed')
            else if (typeof args !== 'function') 
                throw new Error('first paramter must be a function')
            callback = args.toString();
            // get the options object
            if(args2 !== undefined) {
                if(typeof args2 !== 'object') 
                    throw new Error('second parameter must be an object')
                options = args2;
            }
            console.log('method:', method)
            console.log('callback:', callback)
            console.log('options:', options)
            return proxy;
        };
    }
};

// Create a proxy object.
const proxy = new Proxy({}, proxyObjecHandler)

// example usage
proxy
    .master( (master) => {
        console.log(master)
        console.log('some function')
    })
    .slave( slave => {
        console.log('something else', slave)
    }, { a: 1, b: 2})
    //.yetAnotherMethod();

