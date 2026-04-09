import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

export interface JobPayload {
  method: string;
  parameters: unknown;
}

/**
 * Thin wrapper around BullMQ Queue.
 * Replaces the in-process RequestQueue for distributed deployments.
 */
export class RedisQueue {
  private readonly queue: Queue<JobPayload>;

  constructor(
    public readonly name: string,
    connection: Redis,
  ) {
    this.queue = new Queue<JobPayload>(name, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
  }

  async add(payload: JobPayload) {
    return this.queue.add(payload.method, payload);
  }

  async waitingCount(): Promise<number> { return this.queue.getWaitingCount(); }
  async activeCount(): Promise<number>  { return this.queue.getActiveCount(); }
  async failedCount(): Promise<number>  { return this.queue.getFailedCount(); }
  async completedCount(): Promise<number> { return this.queue.getCompletedCount(); }

  async close(): Promise<void> { await this.queue.close(); }
}
