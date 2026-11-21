'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FirestoreKnowledgeDoc } from '@bantai/shared';
import { BookOpen, Upload, Search, FileText, CheckCircle } from 'lucide-react';

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
      // Direct call via fetch to knowledge query endpoint
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/assistant/knowledge/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api.getToken()}`
        },
        body: JSON.stringify({ query: searchQuery.trim(), topK: 3 })
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-bantai-dark">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-bantai-400" /> Personal Knowledge Manager (RAG)
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            100% Local Vector Store & Retrieval-Augmented Generation.
          </p>
        </div>

        {/* Upload Document / Ingest Knowledge */}
        <form onSubmit={handleUpload} className="p-5 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-3">
          <div className="text-xs font-semibold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-bantai-400" /> Ingest Knowledge Document
          </div>

          <input
            type="text"
            required
            value={filename}
            onChange={e => setFilename(e.target.value)}
            placeholder="Document title or filename (e.g. System_Design_Spec.md)..."
            className="w-full px-3.5 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bantai-500"
          />

          <textarea
            required
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Paste text content or document notes to be chunked and embedded locally..."
            rows={4}
            className="w-full px-3.5 py-2.5 bg-black/40 border border-bantai-darkBorder rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bantai-500 resize-none"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-bantai-500 hover:bg-bantai-600 disabled:opacity-50 text-black font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              {uploading ? 'Embedding Chunks...' : 'Vectorize & Store'}
            </button>
          </div>
        </form>

        {/* Semantic Vector Search Test */}
        <div className="p-5 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-3">
          <div className="text-xs font-semibold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-sky-400" /> Test Semantic Vector Retrieval
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Ask a question against your local vector database..."
              className="flex-1 px-3.5 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bantai-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-medium text-xs rounded-xl transition"
            >
              {searching ? 'Searching...' : 'Retrieve'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">Retrieved Vector Chunks:</div>
              {searchResults.map((res, i) => (
                <div key={i} className="p-3 bg-black/30 border border-bantai-darkBorder rounded-xl text-xs space-y-1">
                  <div className="flex justify-between text-[10px] text-bantai-400 font-mono">
                    <span>Similarity Score: {(res.score * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-gray-300">{res.chunk.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ingested Documents List */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-white">Ingested Knowledge Documents ({docs.length})</div>
          {docs.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 bg-bantai-darkCard/40 border border-bantai-darkBorder rounded-2xl">
              No knowledge documents stored yet.
            </div>
          ) : (
            docs.map(doc => (
              <div key={doc.id} className="p-3.5 bg-bantai-darkCard border border-bantai-darkBorder rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-bantai-400" />
                  <div>
                    <span className="font-semibold text-white">{doc.originalName}</span>
                    <div className="text-[10px] text-gray-400">
                      {doc.chunkCount} vector chunks · {doc.sizeBytes} bytes · {new Date(doc.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                  <CheckCircle className="w-3.5 h-3.5" /> Vector Indexed
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
