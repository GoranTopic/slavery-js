import slavery from '../index.js'
import axios from 'axios'

let options = {
    numberOfSlaves: 2, // only 1 slave
    host: 'localhost', 
    port: 3003, 
    slaveOptions: {
        timeout: 2000 // <- set timeout here so that only the slave will have a timeout
    }
}

// lets make sure that the client will also timeout
// NOTE: while this this is test will display correcly,
// there is nothing that will stop the function passed to the slave from running after it has timed out.
// this is becuase of how promise and setTimeout works, 
// there is not wa to stop the 


slavery(options)
    .master( async master => { 
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
        // make a axois request to a random ip address so it will timeout
        axios.get('http://123.124.23.4')
        .then( response => {
            return response.data;
        }).catch( error => {
            console.log('error: ', error.message);
            return error.message;
        })
    );
        


