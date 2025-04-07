import entrypoint from './entry.js';
import { isSlaveMethods, isServiceOptions, isMasterCallback } from './typeGuards.js';
import makeProxyObject from './makeProxyObject.js';
import extractFunctions from './extractFunctions.js';
import PeerDiscoverer from './peerDiscovery/index.js';
export default entrypoint;
export { PeerDiscoverer, makeProxyObject, extractFunctions, isSlaveMethods, isServiceOptions, isMasterCallback };
//# sourceMappingURL=index.js.map