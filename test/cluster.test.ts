import Cluster from '../src/cluster';


let cluster = new Cluster({debugging: false });
// create a new process for the master process
cluster.spawn('master', { 
    allowedToSpawn: true,
    spawnOnlyFromPrimary: true
});

if (cluster.is('master')) {
    let cluster2 = new Cluster({debugging: false });
    console.log('Hello from master');
    cluster2.spawn('worker 1');
    cluster2.spawn('worker 2');
    cluster2.spawn('worker 3');
}


if (cluster.is('worker 1')) 
    console.log('Hello from worker 1');

if (cluster.is('worker 2')) 
    console.log('Hello from worker 2');

if (cluster.is('worker 3'))
    console.log('Hello from worker 3');
