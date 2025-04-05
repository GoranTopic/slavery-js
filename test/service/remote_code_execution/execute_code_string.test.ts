import { execAsyncCode } from '../../../src/utils'
import { expect } from 'chai';

console.log(`[${process.argv[1].split('/').pop()}] Testing code execution function which take code and callbacks as string and execute them in the context of the given callbacks`);

const randomer = {
  getNum: async () =>  ({ value: Math.random() })
};

const greeter = {
  greet: async () => "Hello, world!",
};

const waiter = {
    wait: async (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

const code_line_1 = `
    const num = await randomer.getNum();
    return num;
`;

const code_line_2 = `
    const greeting = await greeter.greet();
    return greeting;
`;

const code_line_3 = `
    await waiter.wait(1000);
    return "Waited 1 second!";
`;

const callback1 =  async ({ randomer } : any) => {
    const num = await randomer.getNum();
    return num;
}

const callback2 = function callback2({ greeter } : any) {
    const greeting = greeter.greet();
    return greeting;
}


async function callback3({ waiter } : any) {
    return await new Promise( async (resolve) => {
        await waiter.wait(1000) 
        resolve("Waited 1 second!");
    });
}

let result = null;
// Test randomer
result = await execAsyncCode(code_line_1, { randomer, greeter, waiter })
expect(result).to.have.property('value');
expect(result.value).to.be.a('number');
// Test greeter
result = await execAsyncCode(code_line_2, { randomer, greeter, waiter })
expect(result).to.be.a('string');
expect(result).to.equal("Hello, world!");
// Test waiter
result = await execAsyncCode(code_line_3, { randomer, greeter, waiter })
expect(result).to.be.a('string');
expect(result).to.equal("Waited 1 second!");
// test callble funstion, callbacks
result = await execAsyncCode(callback1.toString(), { randomer, greeter, waiter })
expect(result).to.have.property('value');
expect(result.value).to.be.a('number');
// Test greeter
result = await execAsyncCode(callback2.toString(), { randomer, greeter, waiter })
expect(result).to.be.a('string');
expect(result).to.equal("Hello, world!");
// Test waiter
result = await execAsyncCode(callback3.toString(), { randomer, greeter, waiter })
expect(result).to.be.a('string');
console.log(`[${process.argv[1].split('/').pop()}] ✅ code execution working correctly!`);








