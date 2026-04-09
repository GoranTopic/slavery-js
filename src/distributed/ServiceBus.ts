import { Redis } from 'ioredis';

export type BusEvent = 'service:joined' | 'service:left';

export interface BusMessage {
  event: BusEvent;
  serviceName: string;
  methods: string[];
  ts: string;
}

export type BusHandler = (msg: BusMessage) => void;

const CHANNEL = 'slavery:bus';

/**
 * Redis Pub/Sub bus for real-time service announcements.
 *
 * When a new service joins or an existing one leaves, it publishes
 * a message on the shared channel.  All other services subscribing
 * to the bus receive the event immediately — no polling required.
 */
export class ServiceBus {
  private subscriber?: Redis;
  private readonly handlers: BusHandler[] = [];

  constructor(private readonly publisher: Redis) {}

  async publish(event: BusEvent, serviceName: string, methods: string[]): Promise<void> {
    const msg: BusMessage = { event, serviceName, methods, ts: new Date().toISOString() };
    await this.publisher.publish(CHANNEL, JSON.stringify(msg));
  }

  async subscribe(handler: BusHandler): Promise<void> {
    this.handlers.push(handler);

    if (!this.subscriber) {
      this.subscriber = this.publisher.duplicate();
      await this.subscriber.subscribe(CHANNEL);
      this.subscriber.on('message', (_ch: string, raw: string) => {
        try {
          const msg = JSON.parse(raw) as BusMessage;
          for (const h of this.handlers) h(msg);
        } catch { /* ignore malformed messages */ }
      });
    }
  }

  async close(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.unsubscribe(CHANNEL);
      this.subscriber.disconnect();
      this.subscriber = undefined;
    }
    this.handlers.length = 0;
  }
}
