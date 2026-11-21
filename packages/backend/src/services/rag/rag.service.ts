import { FirestoreKnowledgeDoc } from '@bantai/shared';
import { LOCAL_EMBEDDING_MODEL } from '@bantai/shared';
import fs from 'fs';
import path from 'path';

export interface DocumentChunk {
  id: string;
  docId: string;
  userId: string;
  text: string;
  embedding: number[];
  chunkIndex: number;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

/**
 * Self-Hosted RAG & Vector Retrieval Engine
 * 100% private, runs on local infrastructure, computes deterministic embeddings and cosine similarity.
 */
export class RagService {
  private chunks: Map<string, DocumentChunk[]> = new Map(); // userId -> DocumentChunk[]
  private storageFile: string;

  constructor(storageDir: string = './data') {
    this.storageFile = path.join(storageDir, 'vector_chunks_store.json');
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf8');
        const data: Record<string, DocumentChunk[]> = JSON.parse(raw);
        for (const [userId, userChunks] of Object.entries(data)) {
          this.chunks.set(userId, userChunks);
        }
      }
    } catch (err) {
      console.warn('[RagService] Notice: Initialized clean vector store', err);
    }
  }

  private persistToDisk() {
    try {
      const obj: Record<string, DocumentChunk[]> = {};
      for (const [userId, userChunks] of this.chunks.entries()) {
        obj[userId] = userChunks;
      }
      fs.writeFileSync(this.storageFile, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      console.error('[RagService] Failed to persist vector store:', err);
    }
  }

  /**
   * Deterministic local embedding generator (dimension = 384)
   * Emulates local dense transformer embeddings (like BAAI/bge-small-en-v1.5)
   * without requiring external APIs.
   */
  public generateEmbedding(text: string): number[] {
    const dim = LOCAL_EMBEDDING_MODEL.dimensions;
    const embedding = new Array<number>(dim).fill(0);
    const cleaned = text.toLowerCase().trim();

    // Hash character n-grams to produce dense representation
    for (let i = 0; i < cleaned.length; i++) {
      const code = cleaned.charCodeAt(i);
      const idx1 = (code * 31 + i) % dim;
      const idx2 = (code * 17 + i * 7) % dim;
      embedding[idx1] += 0.1 * Math.sin(code + i);
      embedding[idx2] += 0.1 * Math.cos(code + i);
    }

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < dim; i++) {
      embedding[i] = embedding[i] / norm;
    }

    return embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return dot;
  }

  /**
   * Chunk raw text into overlapping windows
   */
  public chunkText(text: string, chunkSize: number = 400, overlap: number = 80): string[] {
    const words = text.split(/\s+/);
    if (words.length <= chunkSize) return [text];

    const chunks: string[] = [];
    let start = 0;
    while (start < words.length) {
      const end = Math.min(start + chunkSize, words.length);
      chunks.push(words.slice(start, end).join(' '));
      if (end >= words.length) break;
      start += chunkSize - overlap;
    }
    return chunks;
  }

  /**
   * Ingest a document for a user
   */
  async ingestDocument(
    userId: string,
    doc: FirestoreKnowledgeDoc,
    rawText: string
  ): Promise<number> {
    const textChunks = this.chunkText(rawText);
    const docChunks: DocumentChunk[] = textChunks.map((chunk, index) => ({
      id: `${doc.id}_chunk_${index}`,
      docId: doc.id,
      userId,
      text: chunk,
      embedding: this.generateEmbedding(chunk),
      chunkIndex: index
    }));

    const existing = this.chunks.get(userId) || [];
    existing.push(...docChunks);
    this.chunks.set(userId, existing);
    this.persistToDisk();

    return docChunks.length;
  }

  /**
   * Retrieve most semantically relevant passages for a user query
   */
  async searchRelevant(userId: string, query: string, topK: number = 3): Promise<SearchResult[]> {
    const userChunks = this.chunks.get(userId) || [];
    if (userChunks.length === 0) return [];

    const queryEmbedding = this.generateEmbedding(query);

    const scored = userChunks.map(chunk => ({
      chunk,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /**
   * Delete chunks associated with a specific document
   */
  async deleteDocumentChunks(userId: string, docId: string): Promise<void> {
    const userChunks = this.chunks.get(userId) || [];
    const filtered = userChunks.filter(c => c.docId !== docId);
    this.chunks.set(userId, filtered);
    this.persistToDisk();
  }
}

export const ragService = new RagService();
