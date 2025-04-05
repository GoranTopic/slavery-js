const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;


const randomer = {
  getNum: async () =>  ({ value: Math.random() })
};

const greeter = {
  greet: async () => "Hello, world!",
};

const waiter = {
    wait: async (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

async function runAsyncCode(codeString : string, context = {}) {
  const userFunc = new AsyncFunction(...Object.keys(context), codeString);
  try {
    const result = await userFunc(...Object.values(context));
    return { result };
  } catch (error) {
    return { isError: true, error };
  }
}


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


for (const code_line of [code_line_1, code_line_2, code_line_3]) 
  console.log( await runAsyncCode(code_line, { randomer, greeter, waiter }) );


