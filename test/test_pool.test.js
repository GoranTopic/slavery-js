console.log(`[${process.argv[1].split('/').pop()}] testing if the Pool data sctructure is working correcly`);

import Pool from '../src/server/Pool.js';

let p = new Pool();

console.log(p);
console.log('Test: add a, b, c, d, e');
p.add('a', 1);
p.add('b', 2);
p.add('c', 3);
p.add('d', 4);
p.add('e', 5);
console.log(p);

console.log('Test: disable c');
p.disable('c');
console.log(p);

console.log('Test: disable a, enable a');
p.disable('a');
p.enable('a');
console.log(p);

console.log('Test: disable b, enable b');
p.disable('b');
p.enable('b');
console.log(p);

console.log('Test: disable b, enable b');
for(let i = 0; i < 5; i++) {
    console.log('p.next()');
    let r = p.next();
    console.log(p);
    console.log('got:', r);
}

console.log('Test: enable c');
p.enable('c');
console.log(p);

for(let i = 0; i < 6; i++) {
    console.log('p.nextAndDisable()');
    let r = p.nextAndDisable();
    console.log(p);
    console.log('got:', r);
}

for(let i = 0; i < 6; i++) {
    console.log('p.nextAndEnable()');
    let r = p.nextAndEnable();
    console.log(p);
    console.log('got:', r);
}

