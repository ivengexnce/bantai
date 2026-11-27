import net from 'net';
import tls from 'tls';

/**
 * Lightweight zero-dependency RESP2 client over TCP/TLS for Redis (`redis://` / `rediss://`).
 * Supports AUTH (ACL user/pass or legacy password), SELECT db, GET, SET (with PX TTL),
 * DEL, INCRBY, EXPIRE, and PING with short fail-fast timeouts so callers cleanly degrade to disk.
 */
export class MinimalRedisClient {
  private url: URL;
  private timeoutMs: number;

  constructor(redisUrl: string, timeoutMs = 1500) {
    this.url = new URL(redisUrl);
    this.timeoutMs = timeoutMs;
  }

  private encodeCommand(args: string[]): Buffer {
    const chunks: Buffer[] = [Buffer.from(`*${args.length}\r\n`, 'utf8')];
    for (const arg of args) {
      const buf = Buffer.from(arg, 'utf8');
      chunks.push(Buffer.from(`$${buf.length}\r\n`, 'utf8'), buf, Buffer.from('\r\n', 'utf8'));
    }
    return Buffer.concat(chunks);
  }

  private parseResponses(buf: Buffer): Array<{ value: string | number | null; bytesConsumed: number }> {
    const results: Array<{ value: string | number | null; bytesConsumed: number }> = [];
    let offset = 0;

    while (offset < buf.length) {
      const lineEnd = buf.indexOf('\r\n', offset);
      if (lineEnd === -1) break;

      const prefix = String.fromCharCode(buf[offset]);
      const header = buf.subarray(offset + 1, lineEnd).toString('utf8');

      if (prefix === '+') {
        results.push({ value: header, bytesConsumed: lineEnd + 2 });
        offset = lineEnd + 2;
      } else if (prefix === ':') {
        results.push({ value: parseInt(header, 10), bytesConsumed: lineEnd + 2 });
        offset = lineEnd + 2;
      } else if (prefix === '-') {
        throw new Error(`Redis error: ${header}`);
      } else if (prefix === '$') {
        const len = parseInt(header, 10);
        if (len === -1) {
          results.push({ value: null, bytesConsumed: lineEnd + 2 });
          offset = lineEnd + 2;
        } else {
          const dataStart = lineEnd + 2;
          const dataEnd = dataStart + len;
          if (buf.length < dataEnd + 2) break;
          results.push({
            value: buf.subarray(dataStart, dataEnd).toString('utf8'),
            bytesConsumed: dataEnd + 2
          });
          offset = dataEnd + 2;
        }
      } else {
        throw new Error(`Unsupported RESP prefix '${prefix}'`);
      }
    }

    return results;
  }

  private async runPipeline(commands: string[][]): Promise<Array<string | number | null>> {
    const port = this.url.port ? parseInt(this.url.port, 10) : 6379;
    const host = this.url.hostname;
    const isTls = this.url.protocol === 'rediss:';

    const preamble: string[][] = [];
    if (this.url.password) {
      const pass = decodeURIComponent(this.url.password);
      if (this.url.username) {
        preamble.push(['AUTH', decodeURIComponent(this.url.username), pass]);
      } else {
        preamble.push(['AUTH', pass]);
      }
    }
    const dbMatch = this.url.pathname.match(/^\/(\d+)/);
    if (dbMatch && dbMatch[1] !== '0') {
      preamble.push(['SELECT', dbMatch[1]]);
    }

    const allCommands = [...preamble, ...commands];

    return new Promise((resolve, reject) => {
      const socket: net.Socket | tls.TLSSocket = isTls
        ? tls.connect({ host, port, servername: host })
        : net.connect({ host, port });

      let settled = false;
      let recv = Buffer.alloc(0);
      const collected: Array<string | number | null> = [];

      const cleanup = () => {
        socket.removeAllListeners();
        if (!socket.destroyed) socket.destroy();
      };

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      };

      socket.setTimeout(this.timeoutMs, () => fail(new Error('Redis command timeout')));
      socket.on('error', err => fail(err));

      const connectEvent = isTls ? 'secureConnect' : 'connect';
      socket.on(connectEvent, () => {
        try {
          const payload = Buffer.concat(allCommands.map(cmd => this.encodeCommand(cmd)));
          socket.write(payload);
        } catch (err) {
          fail(err as Error);
        }
      });

      socket.on('data', (chunk: Buffer) => {
        try {
          recv = Buffer.concat([recv, chunk]);
          const parsed = this.parseResponses(recv);
          if (parsed.length > 0) {
            const consumed = parsed[parsed.length - 1].bytesConsumed;
            recv = recv.subarray(consumed);
            for (const item of parsed) {
              collected.push(item.value);
            }
          }
          if (collected.length >= allCommands.length) {
            settled = true;
            cleanup();
            resolve(collected.slice(preamble.length));
          }
        } catch (err) {
          fail(err as Error);
        }
      });
    });
  }

  async get(key: string): Promise<string | null> {
    const [res] = await this.runPipeline([['GET', key]]);
    return typeof res === 'string' ? res : null;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    const cmd = ttlMs && ttlMs > 0 ? ['SET', key, value, 'PX', String(Math.ceil(ttlMs))] : ['SET', key, value];
    await this.runPipeline([cmd]);
  }

  async del(key: string): Promise<void> {
    await this.runPipeline([['DEL', key]]);
  }

  async incrByWithTtl(key: string, delta: number, ttlSeconds: number): Promise<number> {
    const [val] = await this.runPipeline([
      ['INCRBY', key, String(delta)],
      ['EXPIRE', key, String(Math.ceil(ttlSeconds))]
    ]);
    return typeof val === 'number' ? val : Number(val || 0);
  }
}
