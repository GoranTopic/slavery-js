import { expect } from 'chai'
import makeProxyObject from '../../src/app/makeProxyObject'
process.env.debug = 'false';

/* *
 * This test if the proxy service is working correctly, it should return a proxy object which give me acces to the name of the method called and the fuction passed to it.
 * */

let functions_passed = { master: false, slave: false, logger: false }

const po = makeProxyObject( (function_name: string, fn: string, options: any) => {
    // expect to have one of the following names    
    const service_names = ['master', 'slave', 'logger']
    expect(function_name).to.be.oneOf(service_names)
    if(function_name === 'master') {
        expect(fn.toString()).to.be.equal('async()=>{console.log("hello form master")}')
        expect(options).to.be.equal(undefined)
        functions_passed.master = true
    } else if(function_name === 'slave') {
        expect(fn.toString()).to.be.equal('async()=>{1+1}')
        expect(options).to.be.deep.equal({ 
            port: 3000, 
            host: 'localhost',
           number_of_nodes: 1,
            number_of_replicas: 1
        })
        functions_passed.slave = true
    } else if(function_name === 'logger') {
        expect(fn.toString()).to.be.equal('async()=>{console.log("logger")}')
        expect(options).to.be.equal(undefined)
        functions_passed.logger = true
    }
});

console.log(`[${process.argv[1].split('/').pop()}] starting test for proxyObjectHandler, which is the entry point if the application`)
// run the proxy object
//@ts-ignore
po.master(async () => {
    console.log('hello form master')
}).slave(async () => {
    1 + 1;
}, { 
    port: 3000, 
    host: 'localhost',
    number_of_nodes: 1,
    number_of_replicas: 1
}).logger(async () => {
    console.log('logger')
});

if(functions_passed.master && functions_passed.slave && functions_passed.logger) 
    console.log(`[${process.argv[1].split('/').pop()}] ✅ proxyObjectHandler handling functions correctly`)
else
    console.log(`[${process.argv[1].split('/').pop()}] ❌ proxyObjectHandler failed to handle functions correctly` + JSON.stringify(functions_passed))

