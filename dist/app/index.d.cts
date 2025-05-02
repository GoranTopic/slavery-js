import entry from './entry.cjs';
export { isMasterCallback, isServiceOptions, isSlaveMethods } from './typeGuards.cjs';
export { default as makeProxyObject } from './makeProxyObject.cjs';
export { default as extractFunctions } from './extractFunctions.cjs';
export { default as PeerDiscoverer } from './peerDiscovery/PeerDiscoveryServer.cjs';
export { default as Options } from './types/Options.cjs';
import '../service/types/SlaveMethods.cjs';
import '../service/types/Options.cjs';



export { entry as default };
