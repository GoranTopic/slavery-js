import entrypoint from './entry';
import { isSlaveMethods, isServiceOptions, isMasterCallback } from './typeGuards.js';
import makeProxyObject from './makeProxyObject.js';
import extractFunctions from './extractFunctions.js';
import PeerDiscoverer from './peerDiscovery/index.js';
import type { Options } from './types/index.js';
export default entrypoint;
export { Options, PeerDiscoverer, makeProxyObject, extractFunctions, isSlaveMethods, isServiceOptions, isMasterCallback };
