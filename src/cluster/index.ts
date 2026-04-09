import Cluster from './ProcessCluster.js';
export default Cluster;

export type { ClusterMode, ClusterOptions, SpawnOptions, ServiceMap } from './ProcessCluster.js';

export { DockerOrchestrator } from './orchestration/DockerOrchestrator.js';
export { K8sOrchestrator }    from './orchestration/K8sOrchestrator.js';
export type {
  ContainerOrchestrator,
  ContainerInfo,
  ContainerStatus,
  NodeConfig,
  NodeRole,
  WorkerContainerConfig, // backwards-compat alias
} from './orchestration/ContainerOrchestrator.js';
