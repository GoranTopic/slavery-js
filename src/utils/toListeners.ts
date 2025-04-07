import { SlaveMethods } from '../service/index.js'
import { Listener } from '../network/index.js'

/* this function will take a type slaveMethods passed to a Service and return a type Listener */
function toListeners(slaveMethods: SlaveMethods): Listener[] {
    return Object.keys(slaveMethods).map((key) => ({
        event: key,
        parameters: slaveMethods[key].length > 0 ? new Array(slaveMethods[key].length).fill(undefined) : undefined,
        callback: slaveMethods[key],
    }));

}

export default toListeners
