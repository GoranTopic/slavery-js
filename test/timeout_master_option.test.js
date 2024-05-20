import slavery from '../index.js'
import axios from 'axios'

let options = {
    host: 'localhost', 
    port: 3003, 
    timeout: 1000,
}

// this scrip will test that timeout impletmetation 
// is working for when the slave is taking too long


slavery(options)
    .master( async master => { 
        console.log(`[${process.argv[1].split('/').pop()}] test if the timeout is working correcly with when passed as an option`);
        let slave = await master.getIdle(); 
        slave.run()
            .then( result => {
                console.log('❌ timeout failed' );
            }).catch( error => {
                console.error(error);
                if(error.message === 'Slave run callback has timed out')
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
        


