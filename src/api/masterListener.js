import { serializeError } from 'serialize-error';
import getObjectSizeInBytes from '../utils/objectSize.js';

const apiListener = (process, master) => {
    // set up listener for messages from the primary process
    process.on('message', async ({ msg, payload }) => {
        // make case statement for each
        switch (msg) {
                // respond to ping message
            case 'areYouMaster?':
                process.send('I am master')
                break;
                // respond to query number of slavers
            case 'getNumberOfSlaves':
                // get the number of slaves
                let slaves = master.slaves.items
                slaves = Object.keys(slaves)
                    .map(key => ({
                        id: slaves[key].id,
                        status: slaves[key].status,
                        lastUpdateAt: slaves[key].lastUpdateAt,
                    }))
                process.send(slaves)
                break;
            case 'awaitSlavesConnected':
                // await for n number of slave to be connected
                await master.connected(payload)
                process.send(true)
                break;
            default:
                throw new Error('Invalid message from primary process, message: ' + msg)
        }
    });
    // send callback to primary process
    master.onSuccess( ({ slave, result }) => {
        slave = {
            id: slave.id,
            name: slave.name,
            timeout: slave.timeout,
            status: slave.status,
            lastUpdateAt: slave.lastUpdateAt,
        }
        let timestamp = new Date()
        let size = getObjectSizeInBytes(result)
        // truncate result if it is larger than 1MB
        if (size > 1000000) 
            result = 'Result truncated due to size'
        process.send( { 
            msg: 'success', 
            payload: { slave, result, timestamp, size }
        })
    });
    // send error to primary process
    master.onError( ({ slave, error }) => {
        slave = {
            id: slave.id,
            name: slave.name,
            timeout: slave.timeout,
            status: slave.status,
            lastUpdateAt: slave.lastUpdateAt,
        }
        error = serializeError(error)
        let timestamp = new Date()
        process.send({ 
            msg: 'error', 
            payload: { slave, error, timestamp } 
        })
    });
}


export default apiListener;
