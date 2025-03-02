// if we get debug mode, we will log everything

const log = (...args : any[]) => {
    // if we get debug mode in global scope, we will log everything
    if(process.env.debug === 'true')
        console.log(...args);
    else return null;
};


export default log;
