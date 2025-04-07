import entrypoint from './entry';
import { isSlaveMethods, isServiceOptions, isMasterCallback } from './typeGuards';
import makeProxyObject from './makeProxyObject';
import extractFunctions from './extractFunctions';
import PeerDiscoverer from './peerDiscovery';
export default entrypoint;
export { PeerDiscoverer, makeProxyObject, extractFunctions, isSlaveMethods, isServiceOptions, isMasterCallback };
//# sourceMappingURL=index.js.map