import slavery from '../index.js'

let options = {
    numberOfSlaves: 10,
    port: 3003, 
    host: 'localhost', 
    debug: true,
}

// just run the slaves
slavery(options)
.slave()
// console.log('✅ master exited successfully');
