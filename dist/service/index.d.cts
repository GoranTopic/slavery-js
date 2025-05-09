import Service from './Service.cjs';
export { default as ServiceClient } from './ServiceClient.cjs';
export { default as RequestQueue } from './RequestQueue.cjs';
export { default as ProcessBalancer } from './ProcessBalancer.cjs';
export { default as Stash } from './Stash.cjs';
export { default as ServiceAddress } from './types/ServiceAddress.cjs';
export { default as SlaveMethods } from './types/SlaveMethods.cjs';
export { default as Options } from './types/Options.cjs';
import '../network/Network.cjs';
import '../network/Connection.cjs';
import 'socket.io';
import '../network/types/Listener.cjs';
import '../utils/Pool.cjs';
import '../network/Server.cjs';
import 'http';



export { Service as default };
