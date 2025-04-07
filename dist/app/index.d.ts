import entry from './entry.js';
export { isMasterCallback, isServiceOptions, isSlaveMethods } from './typeGuards.js';
export { default as makeProxyObject } from './makeProxyObject.js';
export { default as extractFunctions } from './extractFunctions.js';
export { default as PeerDiscoverer } from './peerDiscovery/PeerDiscoveryServer.js';
export { default as Options } from './types/Options.js';
import '../service/types/SlaveMethods.js';
import '../service/types/Options.js';



export { entry as default };
