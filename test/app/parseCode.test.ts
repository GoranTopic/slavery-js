import { expect } from 'chai';
import { extractFunctions } from '../../src/utils';

const code = `
function hello(value, {hello, word, logger, master}){
    // some code 
    1 + 4;
    let internal = 5;
    console.log("Hello World" + internal);

    function hello(param1, param2){
        console.log('Hello');
        console.log('World');
    }

    let fn = function (param1, param2) {
        something();
    }

    let fn1 = (param1, param2) => { something1(); }

    var fn2 = (param1) => { something2(); }

    // some other outer fuction code
    let internal2 = 10;
    let internal3 = 20;
    console.log("Hello World" + internal2);
    
    const fn3 = name => { 'Hello, ' + name; }

    let fn4 = (param1, param2) => { something4(); }

    // some other outer fuction code
    let internal4 = 40;
    console.log("Hello World" + internal4);
}`;

console.log(`[${process.argv[1].split('/').pop()}] testing function extraction`);
const result = extractFunctions(code);

// evaluate the functions
const outer = result.outer_function.toString();

// Check outer function includes only the non-inner-function code
expect(outer).to.include('function hello(value, {hello, word, logger, master})');
expect(outer).to.include('1 + 4;');
expect(outer).to.include('let internal = 5;');
expect(outer).to.include('let internal2 = 10;');
expect(outer).to.include('let internal3 = 20;');
expect(outer).to.include('let internal4 = 40;');


const innerFnNames = result.inner_functions.map(fn => fn.name);
expect(innerFnNames).to.include.members(['hello', 'fn', 'fn1', 'fn2', 'fn3', 'fn4']);

const innerFnCodes = result.inner_functions.map(fn => fn.fn.toString());
expect(innerFnCodes[0]).to.include('function hello(param1, param2)');
expect(innerFnCodes[0]).to.include('console.log(\'Hello\');');
expect(innerFnCodes[0]).to.include('console.log(\'World\');');


expect(innerFnCodes[1]).to.include('function fn(param1, param2)');
expect(innerFnCodes[1]).to.include('something();');

expect(innerFnCodes[2]).to.include('function fn1(param1, param2)');
expect(innerFnCodes[2]).to.include('something1();');

expect(innerFnCodes[3]).to.include('function fn2(param1)');
expect(innerFnCodes[3]).to.include('something2();');

expect(innerFnCodes[4]).to.include('function fn3(name)');
expect(innerFnCodes[4]).to.include('\'Hello, \' + name')

expect(innerFnCodes[5]).to.include('function fn4(param1, param2)');
expect(innerFnCodes[5]).to.include('something4();');

console.log(`[${process.argv[1].split('/').pop()}] ✅ Functions extracted correctly`);
