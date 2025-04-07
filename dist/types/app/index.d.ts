import entrypoint from './entry';
import { isSlaveMethods, isServiceOptions, isMasterCallback } from './typeGuards';
import makeProxyObject from './makeProxyObject';
import extractFunctions from './extractFunctions';
import PeerDiscoverer from './peerDiscovery';
import type { Options } from './types';
export default entrypoint;
export { Options, PeerDiscoverer, makeProxyObject, extractFunctions, isSlaveMethods, isServiceOptions, isMasterCallback };
