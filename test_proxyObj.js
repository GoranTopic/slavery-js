const proxyObjecHandler = {
    get(target, prop) {
        console.log('target',target)
        // this will take
        return (...args) => {
            console.log(`method: ${prop}`)
            console.log(`arguments: ${args}`)
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
    })
    .yetAnotherMethod();
