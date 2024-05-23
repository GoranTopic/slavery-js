const apiListener = (process, master) => {
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
}

export default apiListener;
