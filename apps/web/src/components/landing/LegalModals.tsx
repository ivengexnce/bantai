'use client';

import React from 'react';
import { Dialog } from '../ui/Dialog';

export function TosModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="TERMS OF SERVICE - BANTAI SOVEREIGN PLATFORM"
      className="max-w-2xl"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-xs text-[#94a3b8] leading-relaxed">
        <div className="p-3 rounded-lg bg-[#151c28] border border-[#242e3f] text-[#f0f2f5]">
          <span className="font-bold text-amber-400 block mb-1">APACHE 2.0 SOVEREIGN LICENSE</span>
          BANTAI is open-source software authored by Meet Maru. You have full freedom to inspect, run, modify, fork, and self-host this software without proprietary restrictions.
        </div>

        <section className="space-y-2">
          <h4 className="text-sm font-bold text-[#f0f2f5] uppercase tracking-wider">
            1. Self-Hosted Infrastructure & Ownership
          </h4>
          <p>
            By deploying BANTAI, you operate an autonomous on-premise computational node. All inference routines, model weights, database instances (MongoDB, Firebase Firestore, disk stores), and agentic tool runners execute directly on hardware you control.
          </p>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-bold text-[#f0f2f5] uppercase tracking-wider">
            2. Autonomous Agent Execution & Human Gates
          </h4>
          <p>
            BANTAI features a 10-tool autonomous agent runtime. System-level shell execution, code compilation, and disk modifications enforce mandatory human-in-the-loop confirmation gates before execution. The operator maintains ultimate responsibility for actions authorized through the platform.
          </p>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-bold text-[#f0f2f5] uppercase tracking-wider">
            3. Zero Commercial Fees & Warranty Disclaimer
          </h4>
          <p>
            The software is provided &quot;as is&quot;, without warranty of any kind, express or implied. In no event shall the authors or copyright holders be liable for any claim, damages, or liabilities arising from the use or distribution of this software.
          </p>
        </section>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase text-[11px] transition-colors"
          >
            I UNDERSTAND AND AGREE
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export function PrivacyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="DATA SOVEREIGNTY & PRIVACY POLICY"
      className="max-w-2xl"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-xs text-[#94a3b8] leading-relaxed">
        <div className="p-3 rounded-lg bg-[#0e1d16] border border-emerald-500/40 text-emerald-300">
          <span className="font-bold text-emerald-400 block mb-1">ZERO-TELEMETRY GUARANTEE</span>
          BANTAI is designed with zero external network egress to commercial AI vendors. No prompts, conversations, or personal memories are ever transmitted to third-party providers.
        </div>

        <section className="space-y-2">
          <h4 className="text-sm font-bold text-[#f0f2f5] uppercase tracking-wider">
            1. Dual-Database Architectural Boundary
          </h4>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>MongoDB Persistence:</strong> Strictly restricted to local authentication credentials and bcrypt-salted password hashes. Never receives conversational prompts or model outputs.</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Firebase Firestore:</strong> Encapsulates conversational history, task lists, calendar records, and 384-dimensional dense vectors. Governed by 520 lines of fine-grained CEL security rules enforcing user-level isolation.</span>
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-bold text-[#f0f2f5] uppercase tracking-wider">
            2. Local AI Model Execution
          </h4>
          <p>
            Inference runs locally via Ollama, llama.cpp, or the built-in deterministic offline engine. Your hardware processes model weights directly. No corporate data scraping, no telemetry beacons, and no analytics trackers exist in this codebase.
          </p>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-bold text-[#f0f2f5] uppercase tracking-wider">
            3. Operator Data Deletion & Export
          </h4>
          <p>
            Operators possess unrestricted control over their data stores. Local disk stores and Firestore collections can be exported or purged instantly at any time via the Settings and Learning console.
          </p>
        </section>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-[11px] transition-colors"
          >
            CONFIRM PRIVACY POLICY
          </button>
        </div>
      </div>
    </Dialog>
  );
}
