import { FirestoreKnowledgeDoc } from '@bantai/shared';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/env';

interface VectorChunk {
  id: string;
  userId: string;
  documentId: string;
  filename: string;
  text: string;
  embedding: number[];
  tokens?: string[];
}

const STOPWORDS = new Set([
  'the', 'is', 'in', 'at', 'of', 'on', 'and', 'or', 'to', 'for', 'with', 'a', 'an', 'by', 'be', 'it', 'as', 'that', 'this'
]);

/**
 * Sovereign Hybrid RAG Vector & BM25 Retrieval Service
 * Strict user-partitioned document chunking, persistence, and hybrid
 * (BM25 lexical + dense hashed cosine) ranking. Zero external cloud vector DBs.
 */
export class RagService {
  private vectorStorePath: string;
  private chunks: VectorChunk[] = [];
  private readonly dimension = 256;
  private persistChain: Promise<void> = Promise.resolve();

  constructor(baseDir: string = process.env.DATA_DIR || config.dataDir) {
    const resolvedDir = path.resolve(baseDir);
    if (!fs.existsSync(resolvedDir)) {
      fs.mkdirSync(resolvedDir, { recursive: true, mode: 0o700 });
    }
    this.vectorStorePath = path.join(resolvedDir, 'rag_vectors.json');
    this.loadVectors();
  }

  private loadVectors() {
    try {
      if (fs.existsSync(this.vectorStorePath)) {
        const raw = fs.readFileSync(this.vectorStorePath, 'utf8');
        const loaded = JSON.parse(raw) as VectorChunk[];
        this.chunks = loaded.map(c => ({
          ...c,
          tokens: c.tokens && c.tokens.length > 0 ? c.tokens : this.tokenize(c.text)
        }));
      }
    } catch {
      console.warn('[RagService] Could not parse stored vectors, initializing empty.');
      this.chunks = [];
    }
  }

  private persistVectors() {
    const payload = JSON.stringify(this.chunks);
    const writeTask = () => {
      try {
        const dir = path.dirname(this.vectorStorePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        }
        const tmp = `${this.vectorStorePath}.tmp.${process.pid}.${Date.now()}`;
        fs.writeFileSync(tmp, payload, { encoding: 'utf8', mode: 0o600 });
        try {
          fs.renameSync(tmp, this.vectorStorePath);
        } catch {
          fs.writeFileSync(this.vectorStorePath, payload, { encoding: 'utf8', mode: 0o600 });
          try {
            fs.unlinkSync(tmp);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.error('[RagService] Save error:', err);
      }
    };

    writeTask();
    this.persistChain = this.persistChain.then(() => undefined).catch(() => undefined);
  }

  private tokenize(text: string): string[] {
    return (text.toLowerCase().match(/[a-z0-9\u0900-\u097f_+#.-]{2,}/g) || [])
      .map(t => t.replace(/^[.-]+|[.-]+$/g, ''))
      .filter(t => t.length >= 2 && !STOPWORDS.has(t));
  }

  /**
   * Hash-projected dense embedding vector (word unigrams + character 3-grams) with L2 normalization
   */
  public computeEmbedding(text: string): number[] {
    const vec = new Array(this.dimension).fill(0);
    const words = text.toLowerCase().replace(/[^a-z0-9\s_+#.-]/g, ' ').split(/\s+/).filter(Boolean);

    for (const word of words) {
      let hash = 5381;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) + hash) + word.charCodeAt(i);
      }
      const idx = Math.abs(hash) % this.dimension;
      vec[idx] += 1.0;

      for (let i = 0; i <= word.length - 3; i++) {
        const trigram = word.slice(i, i + 3);
        let tHash = 5381;
        for (let j = 0; j < 3; j++) {
          tHash = ((tHash << 5) + tHash) + trigram.charCodeAt(j);
        }
        const tIdx = Math.abs(tHash) % this.dimension;
        vec[tIdx] += 0.35;
      }
    }

    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < vec.length; i++) {
        vec[i] = vec[i] / norm;
      }
    }
    return vec;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
    }
    return dot;
  }

  /**
   * Chunk text recursively with overlap preserving contextual boundaries
   */
  public chunkText(text: string, chunkSize = 550, overlap = 100): string[] {
    const cleanText = text.replace(/\r\n/g, '\n').trim();
    if (!cleanText) return [];
    if (cleanText.length <= chunkSize) return [cleanText];

    const result: string[] = [];
    let start = 0;
    while (start < cleanText.length) {
      let end = Math.min(start + chunkSize, cleanText.length);
      if (end < cleanText.length) {
        const lastPeriod = cleanText.lastIndexOf('.', end);
        const lastNewline = cleanText.lastIndexOf('\n', end);
        const splitPoint = Math.max(lastPeriod, lastNewline);
        if (splitPoint > start + chunkSize * 0.45) {
          end = splitPoint + 1;
        }
      }
      const slice = cleanText.slice(start, end).trim();
      if (slice) result.push(slice);
      if (end >= cleanText.length) break;
      start = Math.max(start + 1, end - overlap);
    }
    return result;
  }

  /**
   * Ingest and index a document cleanly isolated to `userId`
   */
  async ingestDocument(
    userId: string,
    doc: FirestoreKnowledgeDoc,
    rawText: string
  ): Promise<number> {
    const textChunks = this.chunkText(rawText);
    const created: VectorChunk[] = textChunks.map((t, idx) => ({
      id: `${doc.id}_chunk_${idx}`,
      userId,
      documentId: doc.id,
      filename: doc.originalName,
      text: t,
      embedding: this.computeEmbedding(t),
      tokens: this.tokenize(t)
    }));

    this.chunks.push(...created);
    this.persistVectors();
    return created.length;
  }

  /**
   * Remove all indexed chunks for a specific user (called on account wipe / GDPR erase)
   */
  public purgeUserVectors(userId: string): number {
    const before = this.chunks.length;
    this.chunks = this.chunks.filter(c => c.userId !== userId);
    const removed = before - this.chunks.length;
    if (removed > 0) {
      this.persistVectors();
    }
    return removed;
  }

  /**
   * Hybrid BM25 + Cosine semantic retrieval strictly scoped to `userId`
   */
  async searchRelevant(
    userId: string,
    query: string,
    topK = 3
  ): Promise<
    Array<{
      chunk: { id: string; docId: string; userId: string; filename: string; text: string };
      text: string;
      score: number;
      documentId: string;
      filename: string;
    }>
  > {
    const userChunks = this.chunks.filter(c => c.userId === userId);
    if (userChunks.length === 0) return [];

    const queryVec = this.computeEmbedding(query);
    const queryTokens = Array.from(new Set(this.tokenize(query)));

    const docTokensList = userChunks.map(c => (c.tokens && c.tokens.length > 0 ? c.tokens : this.tokenize(c.text)));
    const avgDocLen =
      docTokensList.reduce((acc, toks) => acc + toks.length, 0) / Math.max(1, docTokensList.length);

    // Precompute DF for query tokens
    const dfMap = new Map<string, number>();
    for (const qTok of queryTokens) {
      let df = 0;
      for (const toks of docTokensList) {
        if (toks.includes(qTok)) df++;
      }
      dfMap.set(qTok, df);
    }

    const k1 = 1.5;
    const b = 0.75;
    const N = userChunks.length;

    const rawScored = userChunks.map((c, idx) => {
      const toks = docTokensList[idx];
      const dl = Math.max(1, toks.length);
      let bm25 = 0;

      if (queryTokens.length > 0) {
        const tfMap = new Map<string, number>();
        for (const t of toks) {
          tfMap.set(t, (tfMap.get(t) || 0) + 1);
        }

        for (const qTok of queryTokens) {
          const tf = tfMap.get(qTok) || 0;
          if (tf === 0) continue;
          const df = dfMap.get(qTok) || 0;
          const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
          const num = tf * (k1 + 1);
          const den = tf + k1 * (1 - b + (b * dl) / Math.max(1, avgDocLen));
          bm25 += idf * (num / den);
        }
      }

      const cos = Math.max(0, this.cosineSimilarity(queryVec, c.embedding));
      return { chunk: c, bm25, cos };
    });

    const maxBm25 = rawScored.reduce((m, r) => Math.max(m, r.bm25), 0);

    const hybrid = rawScored.map(r => {
      const normBm25 = maxBm25 > 0 ? r.bm25 / maxBm25 : 0;
      const score = maxBm25 > 0 ? 0.55 * normBm25 + 0.45 * r.cos : r.cos;
      return {
        chunk: {
          id: r.chunk.id,
          docId: r.chunk.documentId,
          userId: r.chunk.userId,
          filename: r.chunk.filename,
          text: r.chunk.text
        },
        text: r.chunk.text,
        score: Number(score.toFixed(4)),
        documentId: r.chunk.documentId,
        filename: r.chunk.filename
      };
    });

    hybrid.sort((a, bScore) => bScore.score - a.score);
    return hybrid.slice(0, topK).filter(item => item.score > 0.05);
  }
}

export const ragService = new RagService();
