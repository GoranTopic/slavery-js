import slavery from '../index.js'
import axios from 'axios'

let options = {
    numberOfSlaves: 2, // only 1 slave
    host: 'localhost', 
    port: 3003, 
    timeout: 2000 // <- Set timeout here so that only the slave will have a timeout
}

//let's make sure that the client will also timeout
// NOTE: while this test will display correcly,
// There is nothing that will stop the function passed to the slave from running after it has timed out.
// This is because of how promise and setTimeout work, 
// There is no way to stop the function from running in the backlog


slavery(options)
    .master( async master => { 
        console.log(`[${process.argv[1]}] test if the client will timeout when the slave times out`);
        let slave = await master.getIdle(); 
        slave.run()
            .then( result => {
                console.log('❌ timeout failed' );
            }).catch( error => {
                console.log('✅ concurrent test passed' );
            }).finally( () => {
                master.exit();
            });
    }).slave( async (counter, slave) => 
        // make an axios request to a random IP address so it will timeout
        axios.get('http://123.124.23.4')
        .then( response => {
            return response.data;
        }).catch( error => {
            console.log('error: ', error.message);
            return error.message;
        })
    );
        


