import fs from 'fs';
import path from 'path';
import { config } from '../../config/env';
import { MinimalRedisClient } from './redis_client';

interface StoredRecord {
  value: unknown;
  expiresAt?: number; // epoch ms
}

/**
 * Restart-safe & optional multi-instance state persistence store.
 *
 * Uses atomic JSON snapshots (`DATA_DIR/state_store.json`) as durable local state
 * so JWT revocations, agent execution plans, and daily API quotas survive server
 * restarts, and mirrors operations to Redis whenever `REDIS_URL` is configured.
 */
export class StateStoreService {
  private filePath: string;
  private records: Map<string, StoredRecord> = new Map();
  private redis: MinimalRedisClient | null = null;
  private loadedFileStamp = '';

  constructor(dataDir: string = process.env.DATA_DIR || config.dataDir, redisUrl: string = process.env.REDIS_URL || config.redisUrl) {
    const resolvedDir = path.resolve(dataDir);
    if (!fs.existsSync(resolvedDir)) {
      fs.mkdirSync(resolvedDir, { recursive: true, mode: 0o700 });
    }
    this.filePath = path.join(resolvedDir, 'state_store.json');
    if (redisUrl) {
      try {
        this.redis = new MinimalRedisClient(redisUrl);
      } catch (err) {
        console.warn('[StateStore] Invalid REDIS_URL; falling back to disk store:', (err as Error).message);
      }
    }
    this.loadFromDisk();
  }

  private getFileStamp(): string {
    const stat = fs.statSync(this.filePath, { bigint: true });
    return `${stat.mtimeNs}:${stat.size}`;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [k, rec] of this.records.entries()) {
      if (rec.expiresAt !== undefined && rec.expiresAt <= now) {
        this.records.delete(k);
      }
    }
  }

  private loadFromDisk(force = false): void {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const stamp = this.getFileStamp();
      if (!force && stamp === this.loadedFileStamp) return;

      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Record<string, StoredRecord>;
      this.records = new Map(Object.entries(raw));
      this.loadedFileStamp = stamp;
      this.pruneExpired();
    } catch {
      // Ignore partial reads during concurrent test setup
    }
  }

  private persistToDisk(): void {
    try {
      this.pruneExpired();
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      }
      const obj: Record<string, StoredRecord> = {};
      for (const [k, v] of this.records.entries()) {
        obj[k] = v;
      }
      const payload = JSON.stringify(obj, null, 2);
      const tmp = `${this.filePath}.tmp.${process.pid}.${Date.now()}`;
      fs.writeFileSync(tmp, payload, { encoding: 'utf8', mode: 0o600 });
      try {
        fs.renameSync(tmp, this.filePath);
      } catch {
        // Fallback when Windows briefly holds a handle during concurrent test sweeps
        fs.writeFileSync(this.filePath, payload, { encoding: 'utf8', mode: 0o600 });
        try {
          fs.unlinkSync(tmp);
        } catch {
          // ignore
        }
      }
      try {
        this.loadedFileStamp = this.getFileStamp();
      } catch {
        // ignore
      }
    } catch (err) {
      console.error('[StateStore] Disk persist error:', err);
    }
  }

  public getSync<T = unknown>(key: string): T | null {
    this.loadFromDisk();
    const rec = this.records.get(key);
    if (!rec) return null;
    if (rec.expiresAt !== undefined && rec.expiresAt <= Date.now()) {
      this.records.delete(key);
      this.persistToDisk();
      return null;
    }
    return rec.value as T;
  }

  public setSync(key: string, value: unknown, ttlMs?: number): void {
    this.loadFromDisk();
    const record: StoredRecord = {
      value,
      ...(ttlMs && ttlMs > 0 ? { expiresAt: Date.now() + ttlMs } : {})
    };
    this.records.set(key, record);
    this.persistToDisk();

    if (this.redis) {
      this.redis.set(key, JSON.stringify(value), ttlMs).catch(err => {
        console.warn('[StateStore] Async Redis mirror failed:', (err as Error).message);
      });
    }
  }

  public deleteSync(key: string): void {
    this.loadFromDisk();
    if (this.records.delete(key)) {
      this.persistToDisk();
    }
    if (this.redis) {
      this.redis.del(key).catch(() => {});
    }
  }

  public listByPrefixSync<T = unknown>(prefix: string): Array<{ key: string; value: T }> {
    this.loadFromDisk();
    this.pruneExpired();
    const items: Array<{ key: string; value: T }> = [];
    for (const [key, rec] of this.records.entries()) {
      if (key.startsWith(prefix)) {
        items.push({ key, value: rec.value as T });
      }
    }
    return items;
  }

  public async get<T = unknown>(key: string): Promise<T | null> {
    if (this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (raw !== null) {
          return JSON.parse(raw) as T;
        }
      } catch {
        // Fall back to durable disk store
      }
    }
    return this.getSync<T>(key);
  }

  public async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    this.setSync(key, value, ttlMs);
    if (this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(value), ttlMs);
      } catch {
        // Disk state already safely persisted
      }
    }
  }

  public async delete(key: string): Promise<void> {
    this.deleteSync(key);
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch {
        // ignore
      }
    }
  }

  public async incrByWithTtl(key: string, delta: number, ttlSeconds: number): Promise<number> {
    if (this.redis) {
      try {
        const redisTotal = await this.redis.incrByWithTtl(key, delta, ttlSeconds);
        this.records.set(key, { value: redisTotal, expiresAt: Date.now() + ttlSeconds * 1000 });
        this.persistToDisk();
        return redisTotal;
      } catch {
        // Fall through to disk counter
      }
    }

    const current = Number(this.getSync<number>(key) ?? 0);
    const next = current + delta;
    this.setSync(key, next, ttlSeconds * 1000);
    return next;
  }
}

export const stateStore = new StateStoreService();
