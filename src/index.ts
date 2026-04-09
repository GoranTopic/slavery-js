/* this class the slavery entry point */
import entry, { PeerDiscoverer }  from './app/index.js'
import Node from './nodes/index.js'
import  Service from './service/index.js'
import { log } from './utils/index.js'

// Global handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log('[CRITICAL] Unhandled Promise Rejection:', reason);
});

export default entry

export { Service, Node, PeerDiscoverer }

// Distributed mode (Redis/BullMQ)
export { DistributedService, DistributedWorker, DistributedBalancer, RedisQueue, RedisStash } from './distributed/index.js'
export type { DistributedServiceOptions, DistributedWorkerOptions, SlaveMethods, SlaveMethod, JobPayload, MasterCallback, MasterContext } from './distributed/index.js'

// Service discovery & inter-service communication
export { ServiceRegistry, ServiceBus, PeerClient } from './distributed/index.js'
export type { ServiceEntry, BusEvent, BusMessage, BusHandler, DistributedBalancerConfig } from './distributed/index.js'

// Container orchestration & manifest templates
export { K8sOrchestrator, DockerOrchestrator, ManifestTemplate } from './cluster/orchestration/index.js'
export type { ContainerOrchestrator, ContainerInfo, ContainerStatus, NodeConfig, NodeRole } from './cluster/orchestration/index.js'
