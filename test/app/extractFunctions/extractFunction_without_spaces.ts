import { expect } from 'chai';
import extractFunctions from '../../../src/app/extractFunctions';

const code = ` async({logger,waiter,self})=>{ console.log('testing if everything is running correctly'); let result=await waiter(1e3).then(async()=>{let result2=await logger.info("waiting for 1 second");expect(result2).to.be( "logged")});expect(result).to.be("waiting for 1 second");await logger.exit();await waiter.exit();await self.exit()}`

const formated_code = ` 
function hello({ logger, waiter, self }){
  console.log('testing if everything is running correctly');

  let result = await waiter(1e3).then(async () => {
    let result2 = await logger.info("waiting for 1 second");
    expect(result2).to.be("logged");
    return "waiting for 1 second";
  });

  expect(result).to.be("waiting for 1 second");

  await logger.exit();
  await waiter.exit();
  await self.exit();
}
`;

console.log(`[${process.argv[1].split('/').pop()}] testing function extraction`);
const result = extractFunctions( formated_code )
console.log('result', result);

/*
// evaluate the functions
const outer = result.outer_function.toString();

// Check outer function includes only the non-inner-function code
expect(outer).to.include('async({logger,waiter,self})=>{console.log(\'testing if everything is running correctly\');');
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
*/
