'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FirestoreKnowledgeDoc } from '@bantai/shared';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { NumberTicker } from '../ui/NumberTicker';

export function KnowledgeView() {
  const [docs, setDocs] = useState<FirestoreKnowledgeDoc[]>([]);
  const [filename, setFilename] = useState('');
  const [rawText, setRawText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ chunk: { text: string }; score: number }>>([]);
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    api.getKnowledgeDocs().then(setDocs).catch(console.error);
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename.trim() || !rawText.trim()) return;

    setUploading(true);
    try {
      const created = await api.uploadKnowledgeDoc(filename.trim(), rawText.trim());
      setDocs(prev => [created, ...prev]);
      setFilename('');
      setRawText('');
    } catch (err) {
      console.error('Failed to ingest document:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await api.queryKnowledge(searchQuery.trim(), 3);
      setSearchResults(results || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const totalChunks = docs.reduce((acc, d) => acc + (d.chunkCount || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0e1014] text-[#d4d6db] font-mono text-xs select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Specification */}
        <div className="flex items-center justify-between border-b border-[#20232b] pb-4 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="warning">[07] KNOWLEDGE BASE</Badge>
              <Badge variant="success">384-DIMENSIONAL BGE-SMALL</Badge>
            </div>
            <h1 className="text-xl font-bold text-[#f0f2f5] uppercase tracking-wider">
              Personal Knowledge Manager (RAG)
            </h1>
            <p className="text-xs text-[#8c919e] mt-1">
              Zero external embeddings. All document indexing, chunking, and cosine similarity calculations run locally.
            </p>
          </div>

          <div className="text-right border border-[#20232b] bg-[#12141a] p-3">
            <span className="text-[10px] text-[#8c919e] uppercase block">TOTAL INDEXED CHUNKS</span>
            <div className="text-xl font-bold text-[#cc8e25]">
              <NumberTicker value={totalChunks} />
            </div>
          </div>
        </div>

        {/* Upload Document / Ingest Knowledge */}
        <form onSubmit={handleUpload} className="p-6 bg-[#12141a] border border-[#20232b] space-y-4">
          <div className="text-xs font-bold text-[#f0f2f5] uppercase flex items-center justify-between">
            <span>[+] INGEST KNOWLEDGE DOCUMENT</span>
            <span className="text-[10px] text-[#8c919e]">LOCAL PASSAGE CHUNKER</span>
          </div>

          <input
            type="text"
            required
            value={filename}
            onChange={e => setFilename(e.target.value)}
            placeholder="Document title or filename (e.g. System_Design_Spec.md)..."
            className="w-full px-3 py-2 bg-[#090b0e] border border-[#20232b] text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25]"
          />

          <textarea
            required
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Paste text content or document notes to be chunked and embedded locally..."
            rows={4}
            className="w-full px-3 py-2 bg-[#090b0e] border border-[#20232b] text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25] resize-none"
          />

          <div className="flex justify-between items-center pt-2">
            <span className="text-[10px] text-[#5a6070]">
              Overlapping semantic windows (~500 chars) for maximum cosine precision.
            </span>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={uploading}
            >
              {uploading ? '[EMBEDDING PASSAGES...]' : '[INGEST TO VECTOR STORE]'}
            </Button>
          </div>
        </form>

        {/* Semantic Query Testing Box */}
        <div className="p-6 bg-[#12141a] border border-[#20232b] space-y-4">
          <div className="text-xs font-bold text-[#f0f2f5] uppercase flex items-center justify-between">
            <span>[TEST VECTOR SEMANTIC RETRIEVAL]</span>
            <span className="text-[10px] text-[#10b981]">COSINE SIMILARITY ENGINE</span>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Ask a question or enter keywords to retrieve relevant chunks..."
              className="flex-1 px-3 py-2 bg-[#090b0e] border border-[#20232b] text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25]"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={searching}
            >
              {searching ? '[QUERYING...]' : '[EXECUTE SEARCH]'}
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold text-[#cc8e25] uppercase tracking-wider block">
                TOP SEMANTIC MATCHES:
              </span>
              {searchResults.map((res, i) => (
                <div key={i} className="p-3 bg-[#090b0e] border border-[#20232b] text-xs space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-[#8c919e]">
                    <span>MATCH [{i + 1}]</span>
                    <span className="text-[#10b981] font-bold">COSINE SIMILARITY: {(res.score * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-[#d4d6db] whitespace-pre-wrap leading-relaxed">{res.chunk.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ingested Documents List */}
        <div className="p-6 bg-[#12141a] border border-[#20232b] space-y-3">
          <div className="text-xs font-bold text-[#f0f2f5] uppercase flex items-center justify-between">
            <span>INGESTED DOCUMENTS REGISTRY</span>
            <span className="text-[10px] text-[#8c919e] font-normal">{docs.length} FILES INDEXED</span>
          </div>

          <div className="divide-y divide-[#20232b]">
            {docs.map(doc => (
              <div key={doc.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-[#f0f2f5] uppercase">{doc.filename}</h4>
                  <span className="text-[10px] text-[#5a6070]">
                    Indexed: {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#8c919e]">
                    {doc.chunkCount} PASSAGES
                  </span>
                  <Badge variant="success">[VERIFIED]</Badge>
                </div>
              </div>
            ))}

            {docs.length === 0 && (
              <p className="text-xs text-[#5a6070] text-center py-6 uppercase">
                NO LOCAL DOCUMENTS INDEXED YET. ADD ARCHITECTURE SPECIFICATIONS ABOVE.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
