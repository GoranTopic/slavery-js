import Service from '../../src/service'
import { log } from '../../src/utils'
// add the debug flag to the environment variables to see the debug messages
process.env.debug = 'false';


let service = new Service({
    service_name: 'error_test',
    peerServicesAddresses: [], // no other service will be ableable
    mastercallback: async ({ slaves }: any) => {
        console.log(`[${process.argv[1].split('/').pop()}] testing to check if the error handeling works`);
        // wait for a least one slave before continuing
        await slaves.numberOfNodesConnected(1)
        log(`getting the first slave`);
        let slave = await slaves.getIdle(); 
        await slave.run('throw_error')
        .then( (result: any) => { 
            console.log(`[test][master] slave ${slave.id} returned`);
            if (result.isError) 
                throw new Error(result.error)
            else
                console.log(`[test][master] slave ${slave.id} did not return an error`);
        }).catch(() => console.log(`[test][master] caught the error`));
        // end test
        slaves.exit();
        process.exit(0);
    },
    slaveMethods: {
        'throw_error': async () => {
            // this will throw an error
            throw new Error('this is an error');
        }
    }, // the methods that the slaves will
    options: {
        host: 'localhost',
        port: 3003,
        number_of_nodes: 9,
    }
});
service.start()
