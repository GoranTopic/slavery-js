import type { NodeConfig, NodeRole } from './ContainerOrchestrator.js';
import { K8sOrchestrator } from './K8sOrchestrator.js';

/**
 * Reusable template for generating Kubernetes YAML manifests.
 *
 * Use this to build dynamic YAMLs from a base "skeleton" config:
 *
 * ```ts
 * const tpl = new ManifestTemplate({
 *   image: 'my-registry/slavery:latest',
 *   serviceName: 'my-cluster',
 *   redisUrl: 'redis://redis:6379',
 * });
 *
 * const proxyYaml  = tpl.master('proxy');
 * const usersYaml  = tpl.master('users', { replicas: 2 });
 * const jobYaml    = tpl.process('scrape-task', { env: { URL: 'https://...' } });
 * ```
 */
export class ManifestTemplate {
  constructor(private readonly base: NodeConfig) {}

  /**
   * Generate a Deployment YAML for a master service.
   *
   * @param serviceType  Logical service type (proxy, users, spider, etc.)
   * @param overrides    Per-service overrides (replicas, env, resources, etc.)
   */
  master(serviceType: string, overrides: Partial<NodeConfig> = {}): string {
    return this.generate('master', serviceType, overrides);
  }

  /**
   * Generate a Job YAML for an ephemeral process.
   *
   * @param serviceType  Logical task type (scrape, transform, etc.)
   * @param overrides    Per-job overrides (env, command, args, etc.)
   */
  process(serviceType: string, overrides: Partial<NodeConfig> = {}): string {
    return this.generate('process', serviceType, overrides);
  }

  /**
   * Generate a manifest for any role. Used internally by master() and process().
   */
  generate(role: NodeRole, serviceType: string, overrides: Partial<NodeConfig> = {}): string {
    const config: NodeConfig = {
      ...this.base,
      ...overrides,
      role,
      serviceType,
      name: overrides.name ?? `slavery-${role}-${serviceType}`,
    };
    return K8sOrchestrator.generateManifest(config);
  }

  /**
   * Get the resolved NodeConfig without generating YAML.
   * Useful for passing to K8sOrchestrator.spawnNode() directly.
   */
  resolve(role: NodeRole, serviceType: string, overrides: Partial<NodeConfig> = {}): NodeConfig {
    return {
      ...this.base,
      ...overrides,
      role,
      serviceType,
      name: overrides.name ?? `slavery-${role}-${serviceType}`,
    };
  }
}
