const proxyObjecHandler = {
    get(target: any, prop: any) {
        //console.log('target',target)
        // this will take
        return (args: any) => {
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
    .master( (master:any) => {
        console.log(master)
        console.log('some function')
    })
    .slave( (slave:any) => {
        console.log('something else', slave)
    }, 9090, 'someArgString')
    .yetAnotherMethod();

