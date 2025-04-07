// if we get debug mode, we will log everything

const log = (...args : any[]) => {
    // if we get debug mode in global scope, we will log everything
    if(process.env.debug === 'true'){
        let pretext = process.env.type? process.env.type : 'Primary';
        console.log(`[${pretext}]`, ...args);
    }
    else return null;
};


export default log;
