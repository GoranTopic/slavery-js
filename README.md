# slavery-js

A clustering library for Node.js that lets you scale an application across multiple processes, threads, or machines. Services and worker nodes communicate over Socket.IO, so you can distribute work horizontally and call between services over the network.

## What it does

- **Multiple services**: Define several named services (e.g. `waiter`, `logger`, `api`). Each service has one master process and optionally many worker nodes.
- **Peer discovery**: When using the high-level entry API, a discovery server runs so services find each other by name without hardcoding hosts/ports.
- **Worker pool**: A service can expose *slave methods*. The master sends work to idle workers; you can fix the number of workers or enable auto-scaling.
- **Service-to-service calls**: From a master you get clients for other services and call their methods (e.g. `await waiter.wait(2)`). Calls are request/response over the network.
- **Stash**: A shared key-value store per service, readable and writable from the master and from workers (for sharing state or config).

## Installation

```bash
npm install slavery-js
```

## Quick start (entry API)

The entry API starts a **peer discovery** server and gives you a proxy. Every method you call on the proxy defines a **service** with that name. Services discover each other automatically.

```javascript
import slavery from 'slavery-js';

slavery({
  host: 'localhost',
  port: 3000,
})
  .waiter({
    wait: async (seconds) => {
      await new Promise((r) => setTimeout(r, seconds * 1000));
      return seconds;
    },
  })
  .logger({
    log: async (msg) => console.log(msg),
  })
  .main(async ({ self, waiter, logger }) => {
    const result = await waiter.wait(2);
    await logger.log(`waited ${result} seconds`);
    await waiter.exit();
    await logger.exit();
    await self.exit();
  });
```

- `**.waiter(...)**` and `**.logger(...)**` define services that only have worker methods (no master logic). You pass an object of named functions; each name becomes a callable method from other services.
- `**.main(async (context) => { ... })**` defines a service whose **master** runs the given function. The context object contains:
  - **Peer service clients** by name: `waiter`, `logger`, etc. Call their methods (e.g. `waiter.wait(2)`).
  - `**self`**: the current service — use `self.exit()` to shut it down.
  - `**slaves**`: present only if this service has worker methods; it’s the node manager (see [Direct Service API](#direct-service-api)).
  - `**master**`: the service instance (advanced).

Each call returns the same proxy so you can chain. Order of definition does not determine startup order; services run as soon as they are created.

## Entry API reference

```javascript
slavery(options)
  .serviceName(masterCallback, slaveMethods?, serviceOptions?)
```

- `**options**`: `{ host?, port? }` — used for peer discovery and as defaults for services. Defaults: `host: 'localhost'`, `port: 3000`.
- `**serviceName**`: Any method name **except** reserved: `slave`, `slaves`, `master`, `self` (see [Prohibited names](#prohibited-names)).
- `**masterCallback`**: `(context) => void | Promise<void>`. Required. If you only want workers, pass a no-op: `() => {}`.
- `**slaveMethods**`: Optional object of functions. Each key is a method name callable by other services and by the master (via the service client). Signature: `(params, { slave, self }) => result`. See [Slave methods](#slave-methods).
- `**serviceOptions**`: Optional. Same as [Service options](#service-options) (e.g. `number_of_nodes`, `port`, `host` for this service).

Forms:

- `.name(masterCallback)` — master only.
- `.name(masterCallback, serviceOptions)` — master only, with options.
- `.name(masterCallback, slaveMethods)` — master + workers.
- `.name(masterCallback, slaveMethods, serviceOptions)` — master + workers + options.
- `.name(slaveMethods)` — workers only (master is a no-op).
- `.name(slaveMethods, serviceOptions)` — workers only + options.

## Direct Service API

For full control (fixed addresses, no proxy), use the **Service** class and **peer discovery** or explicit peer addresses.

### Using peer discovery

Services register with a discovery server and get the list of other services dynamically:

```javascript
import slavery, { Service } from 'slavery-js';

// Start peer discovery (e.g. in one process or reuse slavery() entry)
// If you use slavery({ host, port }), discovery is already running at that host:port.

const service = new Service({
  service_name: 'myService',
  peerDiscoveryAddress: { host: 'localhost', port: 3000 },
  mastercallback: async (context) => {
    const { self, otherService } = context;
    const result = await otherService.someMethod(42);
    await otherService.exit();
    await self.exit();
  },
  slaveMethods: {
    someMethod: async (n, { slave }) => n + 1,
  },
  options: { host: 'localhost' }, // port can be 0 to auto-assign
});
service.start();
```

### Using fixed peer addresses

Skip discovery and list peers explicitly:

```javascript
import { Service } from 'slavery-js';

const service = new Service({
  service_name: 'worker',
  peerServicesAddresses: [
    { name: 'api', host: 'localhost', port: 3001 },
  ],
  mastercallback: async ({ api, self }) => {
    const data = await api.fetchData();
    await self.exit();
  },
  slaveMethods: {
    doWork: async (payload, { slave }) => { /* ... */ return result; },
  },
  options: { host: 'localhost', port: 3002 },
});
service.start();
```

### Master callback context

The first argument to `mastercallback` is an object:

- **Peer service clients** (e.g. `api`, `waiter`): one per entry in `peerServicesAddresses` or per service known via peer discovery. Call their methods; they return promises.
- `**slaves`**: the **NodeManager** for this service (only if `slaveMethods` is non-empty). Use it to get an idle worker and run a method: `const worker = await slaves.getIdle(); await worker.run('methodName', params)`.
- `**self`**: the current **Service** instance. Use `self.exit()` to shut down, `self.set(key, value)` / `self.get(key)` for the service stash.
- `**master`**: same as the service instance (alias).

### Slave methods

`slaveMethods` is an object of functions. Each is invoked on a worker when the master (or another service) calls that method on the service client.

Signature:

```javascript
async (params, { other_services, self }) => result
```

- `**params**`: value passed by the caller (e.g. `await client.wait(5)` → `params === 5`).
- `**slave**`: the worker node object. Has `id`, and you can attach state: `slave['myKey'] = value` for the lifetime of that worker.
- `**self**`: the node’s stash interface: `self.get(key)`, `self.set(key, value)` (or `getStash`/`setStash`). Data is stored on the master’s stash and is shared across workers. Values must be JSON-serializable.

Special method names:

- `**_startup**`: run once when the worker starts (before it accepts work).
- `**_cleanup**`: run when the worker is shutting down.

Example:

```javascript
slaveMethods: {
  _startup: async (_, { slave }) => {
    slave.cache = new Map();
  },
  process: async (item, { slave, self }) => {
    const config = await self.get('config');
    return processItem(item, slave.cache, config);
  },
  _cleanup: async (_, { slave }) => {
    slave.cache = null;
  },
}
```

### Calling other services

From the master you get a client per peer service. The client exposes:

- **Slave methods** you defined (e.g. `wait`, `process`).
- **Built-in methods** (see below).

Examples:

```javascript
const result = await awaiter.wait(2);
await awaiter._add_node(3);
const count = await awaiter._get_nodes_count();
await awaiter.exit();
```

### Selecting specific workers

To target one or more workers instead of any idle one:

```javascript
await serviceClient._number_of_nodes_connected(3);
const oneNode = await serviceClient.select(1);   // one worker
const threeNodes = await serviceClient.select(3); // three workers
const allNodes = await serviceClient.select('all');

const id = await oneNode.getId();           // if you expose getId in slaveMethods
const result = await oneNode.myMethod(arg);
```

`select(n)` returns a **new** client that sends subsequent calls to the selected node(s). If multiple nodes are selected, methods return an array of results.

### Built-in service methods

Every service client supports these (they are implemented by the framework):


| Method                          | Description                                                |
| ------------------------------- | ---------------------------------------------------------- |
| `_get_nodes_count`              | Number of worker nodes.                                    |
| `_get_nodes`                    | List of nodes with `id` and `status`.                      |
| `_get_idle_nodes`               | Idle node list.                                            |
| `_get_busy_nodes`               | Busy node list.                                            |
| `_number_of_nodes_connected(n)` | Resolves when at least `n` nodes are connected.            |
| `_select(n | 'all')`            | Used internally by `.select()`.                            |
| `_add_node(n?)`                 | Add one or `n` workers.                                    |
| `_kill_node(id?)`               | Kill one worker (by id), or one arbitrary worker if no id. |
| `_queue_size`                   | Current request queue size.                                |
| `_turn_over_ratio`              | Queue turnover metric.                                     |
| `exit()`                        | Shut down the service.                                     |
| `_exec(codeString)`             | Run a code string on a worker (advanced).                  |
| `exec_master(codeString)`       | Run a code string on the **master** (advanced).            |


### Stash (shared state)

- **Master**: `self.set(key, value)` and `self.get(key)` on the service instance.
- **Workers**: inside slave methods, `self.get(key)` and `self.set(key, value)` (or `getStash`/`setStash`) use the same stash. Values must be JSON-serializable.

Use the stash for config, caches, or coordination between master and workers.

### Service options

Pass as the last argument to the entry proxy or in `options` when creating a `Service`:


| Option                                       | Description                                                      |
| -------------------------------------------- | ---------------------------------------------------------------- |
| `host`                                       | Bind / discovery host.                                           |
| `port`                                       | Bind / discovery port (use `0` to auto-assign).                  |
| `nm_host`, `nm_port`                         | Node manager bind address (defaults from `host`).                |
| `number_of_nodes`                            | Fixed number of workers. If set, auto-scaling is off by default. |
| `auto_scale`                                 | If `true`, scale workers by queue size and idle count.           |
| `max_number_of_nodes`, `min_number_of_nodes` | Bounds when auto-scaling.                                        |
| `timeout`                                    | Request timeout (ms).                                            |
| `throwError`, `returnError`, `logError`      | How to handle errors from workers.                               |
| `onError`                                    | `'throw' | 'log' | 'ignore'` for request handling.               |


### Prohibited names

**Service names** (proxy method names) you cannot use:

- `slave`, `slaves`, `master`, `self`

**Slave method names** you cannot use (reserved by the framework):

- `all`, `select`, `selectOne`, `one`, `connect`, `disconnect`, `reconnect`, `exit`
- `_run`, `_name`, `_id`, `_listeners`, `_set_listeners`, `_set_services`, `_ping`, `_pong`, `_exit`
- `_connect_service`, `_is_idle`, `_is_busy`, `_is_error`, `_has_done`, `_set_status`
- `_get_nodes_count`, `_get_nodes`, `_get_idle_nodes`, `_get_busy_nodes`, `_select_node`, `_select_nodes`, `_add_node`, `_kill_node`, `_queue_size`, `_turn_over_ratio`

See `docs/prohibited_varible_names.txt` for the full list.

## Imports

```javascript
// ESM
import slavery from 'slavery-js';
import { Service, PeerDiscoverer } from 'slavery-js';

// CommonJS
const { default: slavery, Service, PeerDiscoverer } = require('slavery-js');
```

- `**PeerDiscoverer**`: default export of `src/app/peerDiscovery` is the **PeerDiscoveryServer**. If you use the entry `slavery({ host, port })`, it starts this server for you. You can also start it manually and then use `Service` with `peerDiscoveryAddress`.

## Running tests

```bash
npm test
```

Tests are in `test/`, e.g. `test/app/entry.test.ts`, `test/service/service_request.test.ts`, `test/slaves/slaves.test.ts`. They start multiple services and assert on cross-service calls, scaling, stash, and peer discovery.

## License

ISC