/* this class the slavery entry point */
import entry, { PeerDiscoverer }  from './app/index.js'
import Node from './nodes/index.js'
import  Service from './service/index.js'
import { log } from './utils/index.js'

// Global handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log('[CRITICAL] Unhandled Promise Rejection:', reason);
  // You could also add error reporting, crash recovery, or other handling here
});

export default entry

export { Service, Node, PeerDiscoverer }


