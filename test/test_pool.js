import Pool from '../src/server/Pool.js';

let p = new Pool();

console.log(p);
console.log('add a, b, c, d, e');
p.add('a', 1);
p.add('b', 2);
p.add('c', 3);
p.add('d', 4);
p.add('e', 5);
console.log(p);

console.log('disable a, enable a');
p.disable('a');
p.enable('a');
console.log(p);

console.log('disable c');
p.disable('c');
console.log(p);

console.log('disable b, enable b');
p.disable('b');
p.enable('b');
console.log(p);

for (let i = 0; i < 5; i++) {
    console.log('p.next()');
    let r = p.next();
    console.log(p);
    console.log(r);
}

console.log('enable c');
p.enable('c');
console.log(p);

for (let i = 0; i < 6; i++) {
    console.log('p.nextAndDisable()');
    let r = p.nextAndDisable();
    console.log(p);
    console.log(r);
}


