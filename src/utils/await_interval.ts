/* this function is used to await a condition to be met with a certain interval and timeout
 * until the condition is met or the timeout is reached */
type awaitIntervalOptions = {
    condition: () => any;
    timeout?: number;
    interval?: number;
    error?: string;
}

async function interval_await({ condition, timeout = 10000, interval = 100, error = 'hasTimedOut' }: awaitIntervalOptions): Promise<any> {
    return await new Promise( async (resolve, reject) => {
        let timeout_obj : NodeJS.Timeout
        let interval_obj : NodeJS.Timeout
        // set a timeout to reject the promise
        if(timeout > 0){
            timeout_obj = setTimeout(() => {
                clearInterval(interval_obj);
                reject(new Error(error));
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
