import { db } from '../database/drizzle-adapter';
import { outbox } from '../database/schema';
import { eq, isNull, asc, sql } from 'drizzle-orm';
import Redis from 'ioredis';
import type { TTimestamp } from '../types/branded-types';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class OutboxPoller {
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Replay unprocessed on start
    await this.replayUnprocessed();

    this.interval = setInterval(async () => {
      await this.pollAndProcess();
    }, 100); // 100ms
  }

  private async pollAndProcess(): Promise<void> {
    try {
      const unprocessed = await db
        .select()
        .from(outbox)
        .where(isNull(outbox.processedAt))
        .orderBy(asc(outbox.createdAt))
        .limit(100);

      for (const event of unprocessed) {
        await this.processEvent(event);
      }
    } catch (err) {
      console.error('Poller error:', err);
    }
  }

  private async processEvent(event: any): Promise<void> {
    try {
      // Publish to Redis pub/sub
      await redis.publish(event.eventType, JSON.stringify(event.payload));

      // Mark processed
      await db
        .update(outbox)
        .set({ 
          processedAt: new Date() as TTimestamp,
          attempts: event.attempts + 1 
        })
        .where(eq(outbox.id, event.id));

    } catch (err) {
      // Retry logic: increment attempts
      await db
        .update(outbox)
        .set({ attempts: sql`${outbox.attempts} + 1` })
        .where(eq(outbox.id, event.id));

      if (event.attempts > 5) {
        // Move to dead letter or log
        console.error('Max retries for event:', event.id);
      }
    }
  }

  private async replayUnprocessed(): Promise<void> {
    const unprocessed = await db
      .select()
      .from(outbox)
      .where(isNull(outbox.processedAt));

    for (const event of unprocessed) {
      await this.processEvent(event);
    }
  }

  async stop(): Promise<void> {
    if (this.interval) clearInterval(this.interval);
    this.isRunning = false;
    await redis.quit();
  }
}

// Export for use
export const poller = new OutboxPoller();