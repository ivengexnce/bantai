'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FirestoreKnowledgeDoc } from '@bantai/shared';
import { BookOpen, Upload, Search, FileText, CheckCircle, Database, Layers } from 'lucide-react';

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
    <div className="flex-1 overflow-y-auto p-8 bg-bantai-dark">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bantai-500/10 border border-bantai-500/30 text-xs font-semibold text-bantai-400 mb-2">
              <Layers className="w-3.5 h-3.5" /> 384-Dimensional Local Vector Store
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Personal Knowledge Manager (RAG)</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Zero external embeddings. All document indexing, chunking, and cosine similarity calculations run locally.
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-gray-400">Total Indexed Chunks</span>
            <div className="text-xl font-bold text-bantai-400 font-mono">{totalChunks}</div>
          </div>
        </div>

        {/* Upload Document / Ingest Knowledge */}
        <form onSubmit={handleUpload} className="p-6 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-4 shadow-xl">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-bantai-400" /> Ingest Knowledge Document
          </div>

          <input
            type="text"
            required
            value={filename}
            onChange={e => setFilename(e.target.value)}
            placeholder="Document title or filename (e.g. System_Design_Spec.md)..."
            className="w-full px-3.5 py-2.5 bg-black/40 border border-bantai-darkBorder rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bantai-500"
          />

          <textarea
            required
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Paste text content or document notes to be chunked and embedded locally..."
            rows={4}
            className="w-full px-3.5 py-2.5 bg-black/40 border border-bantai-darkBorder rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bantai-500 resize-none font-mono"
          />

          <div className="flex justify-between items-center">
            <span className="text-[11px] text-gray-500">
              Chunked into ~500 character overlapping windows for accurate RAG recall.
            </span>
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2 bg-bantai-500 hover:bg-bantai-600 disabled:opacity-50 text-black font-bold text-xs rounded-xl transition shadow-md shadow-bantai-500/20"
            >
              {uploading ? 'Embedding Document...' : 'Ingest to Local Vector Store'}
            </button>
          </div>
        </form>

        {/* Semantic Query Testing Box */}
        <div className="p-6 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-bantai-400" /> Test Vector Semantic Retrieval
          </h2>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Ask a question or enter keywords to retrieve relevant chunks..."
              className="flex-1 px-3.5 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bantai-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl transition"
            >
              {searching ? 'Querying...' : 'Search'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Top Semantic Matches:</span>
              {searchResults.map((res, i) => (
                <div key={i} className="p-3 bg-black/40 border border-bantai-darkBorder rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                    <span>Match #{i + 1}</span>
                    <span className="text-emerald-400 font-bold">Cosine Similarity: {(res.score * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-gray-300 whitespace-pre-wrap">{res.chunk.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ingested Documents List */}
        <div className="p-6 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center justify-between">
            <span>Your Ingested Documents</span>
            <span className="text-xs text-gray-500 font-normal">{docs.length} indexed files</span>
          </h2>

          <div className="divide-y divide-bantai-darkBorder">
            {docs.map(doc => (
              <div key={doc.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-bantai-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white">{doc.filename}</h4>
                    <span className="text-[11px] text-gray-500">
                      Uploaded on {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400">
                    {doc.chunkCount} vector chunks
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Indexed
                  </span>
                </div>
              </div>
            ))}

            {docs.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-6">
                No documents uploaded yet. Add your architecture notes, study material, or specifications above.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
