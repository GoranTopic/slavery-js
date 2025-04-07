/* this function is used to await a condition to be met with a certain interval and timeout
 * until the condition is met or the timeout is reached */
async function interval_await(condition: () => any, 
                              timeout: number = 10000,
                              interval: number = 100) : Promise<any> {
    return await new Promise( async (resolve, reject) => {
        let timeout_obj : NodeJS.Timeout 
        let interval_obj : NodeJS.Timeout 
        // set a timeout to reject the promise
        if(timeout > 0){
            timeout_obj = setTimeout(() => {
                clearInterval(interval_obj);
                reject('timeout');
            }, timeout);
        }
        // set an interval to check the condition
        interval_obj = setInterval( async  () => {
            // check if the condition is met
            let result: Boolean = await condition();
            if(result === true) {
                clearInterval(interval_obj);
                clearTimeout(timeout_obj);
                resolve(result);
            }
        }, interval);
    }).catch( error => {
        throw error;
    });
}

export default interval_await;
