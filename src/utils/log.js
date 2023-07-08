// if we get debug mode, we will log everything

let log = (...args) => {
    // if we get debug mode in global scope, we will log everything
    if( process.env.debug) console.log(...args);
    else return null;
};


export default log;
