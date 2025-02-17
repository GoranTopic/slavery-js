import Cluster from '../src/cluster';


let cluster = new Cluster({debugging: true });
// create a new process for the master process
cluster.spawn('master', { 
    allowedToSpawn: true,
    spawnOnlyFromPrimary: true
});

if (cluster.is('master')) {
    console.log('Hello from master');
    cluster.spawn('worker 1');
    cluster.spawn('worker 2');
    cluster.spawn('worker 3');
}


if (cluster.is('worker 1')) 
    console.log('Hello from worker 1');

if (cluster.is('worker 2')) 
    console.log('Hello from worker 2');

if (cluster.is('worker 3'))
    console.log('Hello from worker 3');
