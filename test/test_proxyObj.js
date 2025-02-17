const proxyObjecHandler = {
    get(target, prop) {
        //console.log('target',target)
        // this will take
        return (args) => {
            console.log(`method: ${prop} called`)
            // type of args
            console.log(typeof args)
            //to string
            //let strs = args.map( arg => arg.toString())
            //console.log(`arguments:`)
            //console.log(strs)
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
    }, 9090, 'someArgString')
    .yetAnotherMethod();

