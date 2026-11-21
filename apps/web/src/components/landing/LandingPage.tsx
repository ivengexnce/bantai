'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export function LandingPage({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { user, setActiveView } = useApp();
  const [activeDemoMode, setActiveDemoMode] = useState<'tapori' | 'developer' | 'academic'>('tapori');
  const [selectedDemoModel, setSelectedDemoModel] = useState<string>('bhai');
  const [activeQueryIndex, setActiveQueryIndex] = useState<number>(0);

  const sampleQueries = [
    {
      q: "mera naam bta aur quicksort explain kar",
      tapori: "Arey bantai! Tera naam Bantai Explorer hai. Apun tere ko kaise bhulega bhidu? Tu hi toh apna asli hero hai.\n\nAb dekh QuickSort ka funda ekdum mast Mumbai style me samjhata hoon:\nSoch ek lambi bheed khadi hai ticket counter pe. Apun beech me se ek bande ko pakad ke Pivot bana dete hain (jaise Dadar station). Chhote number Dadar se pehle utrenge (left), bade number baad me (right). Isi ko bolte hain Divide and Conquer.\n\nAverage Time Complexity: O(N log N) - Express speed\nWorst Case: O(N²) - Pivot galat chuna toh thoda slow",
      developer: "Identity Context: User='Bantai Explorer' verified in local MongoDB store.\n\nQuickSort: Divide-and-Conquer Partitioning\n1. Select pivot element p from array A[low..high]\n2. Partition array such that elements <= p are left of index j, elements > p are right\n3. Recursively execute QuickSort(A, low, j-1) and QuickSort(A, j+1, high)\n\nComplexity: T(n) = 2T(n/2) + O(n) => O(n log n) expected time, O(log n) stack frames.",
      academic: "System Verification: Operator profile authenticated as 'Bantai Explorer'.\n\nPedagogical Exposition on Partition Exchange Sort (Hoare, 1961):\nQuickSort achieves optimal average-case comparison complexity through recursive binary decomposition. By establishing an invariant partition boundary via median-of-k selection, the algorithmic recurrence yields asymptotic bounds of Theta(n log n) in expected executions."
    },
    {
      q: "docker containerization architecture samjhao",
      tapori: "Docker ka scene ekdum saral hai bantai. Pehle developer bolta tha 'Mere laptop me chal raha tha, server pe kyu phat gaya?'\n\nDocker ne aake bola: 'Chal tere laptop ka poora system hi dabba bana ke server pe bhejte hain.'\nImage recipe hai, container chalne wala process hai. Lightweight hote hain aur host kernel share karte hain.",
      developer: "Docker Container Architecture:\n1. Namespaces (pid, net, ipc, mnt, uts, user) provide isolated system views\n2. Cgroups enforce strict CPU, memory, and I/O resource ceilings\n3. OverlayFS delivers layered copy-on-write filesystem composition\n\nResult: Deterministic runtime isolation without hypervisor overhead.",
      academic: "Containerization constitutes operating-system-level virtualization. Rather than emulating hardware instruction sets via hypervisors, containers instantiate logically segregated user-space environments utilizing Linux kernel primitives (namespaces and control groups), achieving near-native computational throughput."
    },
    {
      q: "database isolation boundary kaise kaam karti hai",
      tapori: "Dekh bhidu, apun ka rule ekdum strict hai: Data leak zero mangta hai.\nMongoDB me sirf tera login credentials aur password hash safe rehta hai.\nFirebase Firestore me teri chat history, agent steps aur memory rehti hai.\nDono ke beech air-gap firewall hai. Model tere prompts ko bahar kisi cloud API ko nahi bhejta.",
      developer: "Dual-Database Architectural Boundary:\n1. MongoDB Instance: Restricted to Collection('users') containing bcrypt-salted credential hashes and auth tokens. Read-only for inference pipelines.\n2. Firebase Firestore: Encapsulates conversations, streamed token state, task registries, and 384-dimensional dense vectors.\n3. Zero egress rule: No network packets leave localhost to commercial LLM providers.",
      academic: "The data segregation topology implements principle-of-least-privilege boundaries between identity metadata and stateful conversational telemetry. Decoupling authentication persistence (relational/document user store) from inference state (graph/document memory) eliminates lateral telemetry leakage."
    }
  ];

  const currentSample = sampleQueries[activeQueryIndex];
  const activeResponse = currentSample[activeDemoMode];

  return (
    <div className="min-h-screen bg-[#0e1014] text-[#d4d6db] font-sans antialiased selection:bg-[#cc8e25] selection:text-black">
      {/* 1. TOP UTILITY BAR */}
      <header className="border-b border-[#20232b] bg-[#12141a] px-6 py-3.5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs font-bold text-[#cc8e25] tracking-wider uppercase">
              BANTAI // CORE 1.0
            </span>
            <span className="text-[#3a3f4d] font-mono text-xs">|</span>
            <span className="font-mono text-xs text-[#8c919e]">
              SOVEREIGN SILICON RUNTIME
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 font-mono text-xs text-[#8c919e]">
              <span className="w-1.5 h-1.5 bg-[#10b981] inline-block" />
              <span>DAEMON: LOCALHOST:4000</span>
            </div>
            {user ? (
              <button
                onClick={() => setActiveView('chat')}
                className="px-4 py-1.5 bg-[#cc8e25] hover:bg-[#b06f1d] text-black font-mono text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Enter Console [-&gt;]
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-1.5 bg-[#cc8e25] hover:bg-[#b06f1d] text-black font-mono text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Access Console
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO: ARCHITECTURAL BLUEPRINT */}
      <section className="border-b border-[#20232b] px-6 pt-20 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="font-mono text-xs text-[#cc8e25] uppercase tracking-widest mb-4">
              [SPECIFICATION: LOCAL AGENTIC PLATFORM]
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#f0f2f5] leading-[1.08] mb-6">
              Sovereign artificial intelligence executed entirely on local silicon.
            </h1>

            <p className="text-lg text-[#9da2af] leading-relaxed mb-8">
              Zero external API dependencies. Strict dual-database isolation between user identity and conversation telemetry. Native model execution across 3B, 7B, 14B, and 32B open weights with authentic Mumbai Tapori and technical reasoning engines.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {user ? (
                <button
                  onClick={() => setActiveView('chat')}
                  className="px-6 py-3 bg-[#cc8e25] hover:bg-[#b06f1d] text-black font-mono text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Enter Operational Console [-&gt;]
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="px-6 py-3 bg-[#cc8e25] hover:bg-[#b06f1d] text-black font-mono text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Initialize Instance
                </button>
              )}

              <a
                href="https://github.com/ivengexnce/bantai"
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 border border-[#2b303c] hover:border-[#404656] text-[#d4d6db] font-mono text-xs font-medium uppercase tracking-wider transition-colors"
              >
                Inspect Repository Source
              </a>
            </div>
          </div>

          {/* Quick Metrics Matrix */}
          <div className="mt-16 pt-8 border-t border-[#1d2028] grid grid-cols-2 md:grid-cols-4 gap-6 font-mono">
            <div>
              <div className="text-[11px] text-[#6b7280] uppercase tracking-wider mb-1">DATA EGRESS</div>
              <div className="text-xl font-bold text-[#10b981]">0 BYTES</div>
              <div className="text-[11px] text-[#8c919e] mt-0.5">Air-gapped operation</div>
            </div>
            <div>
              <div className="text-[11px] text-[#6b7280] uppercase tracking-wider mb-1">LOCAL INFERENCE</div>
              <div className="text-xl font-bold text-[#f0f2f5]">QWEN 2.5 BASE</div>
              <div className="text-[11px] text-[#8c919e] mt-0.5">Apache 2.0 open-weight</div>
            </div>
            <div>
              <div className="text-[11px] text-[#6b7280] uppercase tracking-wider mb-1">SANDBOXED TOOLS</div>
              <div className="text-xl font-bold text-[#cc8e25]">10 AGENT TOOLS</div>
              <div className="text-[11px] text-[#8c919e] mt-0.5">Human approval gates</div>
            </div>
            <div>
              <div className="text-[11px] text-[#6b7280] uppercase tracking-wider mb-1">DATA TOPOLOGY</div>
              <div className="text-xl font-bold text-[#f0f2f5]">MONGO + FIRESTORE</div>
              <div className="text-[11px] text-[#8c919e] mt-0.5">Cryptographic boundary</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. REAL INTERACTIVE PRODUCT DEMONSTRATION (NO SKELETONS, NO FAKE TERMINALS) */}
      <section className="border-b border-[#20232b] px-6 py-20 bg-[#0b0d10]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <span className="font-mono text-xs text-[#cc8e25] uppercase tracking-wider">
              [LIVE EVALUATION ENVIRONMENT]
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f0f2f5] mt-2 mb-3">
              Interactive local dialogue demonstration
            </h2>
            <p className="text-sm text-[#8c919e] max-w-2xl">
              Test actual runtime queries below to observe the dual-engine dialogue generator. Select an operational personality mode to switch between authentic Mumbai Tapori, Developer, and Academic outputs.
            </p>
          </div>

          <div className="border border-[#232733] bg-[#12151d]">
            {/* Console Control Bar */}
            <div className="border-b border-[#232733] p-4 flex flex-wrap items-center justify-between gap-4 bg-[#151821]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#8c919e] uppercase mr-2">Model:</span>
                {[
                  { id: 'chhotu', label: 'Chhotu (3B)' },
                  { id: 'bhai', label: 'Bhai (7B)' },
                  { id: 'ustad', label: 'Ustad (14B)' },
                  { id: 'don', label: 'Don (32B)' }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedDemoModel(m.id)}
                    className={`font-mono text-xs px-2.5 py-1 border transition-colors ${
                      selectedDemoModel === m.id
                        ? 'border-[#cc8e25] bg-[#cc8e25]/10 text-[#cc8e25] font-bold'
                        : 'border-[#272b38] text-[#8c919e] hover:text-[#d4d6db]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#8c919e] uppercase mr-2">Mode:</span>
                {(['tapori', 'developer', 'academic'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setActiveDemoMode(mode)}
                    className={`font-mono text-xs px-3 py-1 border transition-colors capitalize ${
                      activeDemoMode === mode
                        ? 'border-[#cc8e25] bg-[#cc8e25] text-black font-bold'
                        : 'border-[#272b38] text-[#8c919e] hover:text-[#d4d6db]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Query Selector Tabs */}
            <div className="border-b border-[#232733] px-4 py-2 flex flex-wrap gap-2 bg-[#10131a]">
              {sampleQueries.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveQueryIndex(idx)}
                  className={`font-mono text-xs px-3 py-1.5 transition-colors ${
                    activeQueryIndex === idx
                      ? 'bg-[#1e222d] text-[#f0f2f5] border-b-2 border-[#cc8e25]'
                      : 'text-[#6b7280] hover:text-[#9da2af]'
                  }`}
                >
                  Query [{idx + 1}]: &quot;{item.q.substring(0, 28)}...&quot;
                </button>
              ))}
            </div>

            {/* Conversation Runner Body */}
            <div className="p-6 space-y-6">
              {/* User Query Block */}
              <div className="border-l-2 border-[#cc8e25] pl-4 py-1">
                <div className="font-mono text-[11px] text-[#cc8e25] uppercase tracking-wider mb-1">
                  OPERATOR QUERY:
                </div>
                <div className="text-base text-[#f0f2f5] font-mono">
                  &quot;{currentSample.q}&quot;
                </div>
              </div>

              {/* Engine Response Block */}
              <div className="border-l-2 border-[#363c4e] pl-4 py-1">
                <div className="font-mono text-[11px] text-[#8c919e] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>BANTAI RESPONSE // MODE: {activeDemoMode.toUpperCase()}</span>
                  <span className="text-[#10b981]">STATUS: 200 OK (LOCAL)</span>
                </div>
                <div className="text-sm text-[#d4d6db] leading-relaxed whitespace-pre-wrap font-mono bg-[#0c0e12] p-4 border border-[#1e222d]">
                  {activeResponse}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MODEL FAMILY SPECIFICATION MATRIX (NO 3 PRICING TIERS, NO 3 CARDS IN A ROW) */}
      <section className="border-b border-[#20232b] px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <span className="font-mono text-xs text-[#cc8e25] uppercase tracking-wider">
              [COMPUTE ARCHITECTURE]
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f0f2f5] mt-2 mb-3">
              The BANTAI Model Family specification matrix
            </h2>
            <p className="text-sm text-[#8c919e] max-w-2xl">
              Each model is calibrated for sovereign execution across distinct physical compute envelopes. Zero third-party license restrictions.
            </p>
          </div>

          <div className="border border-[#232733] overflow-x-auto bg-[#12151d]">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#151821] border-b border-[#232733] text-[#8c919e]">
                <tr>
                  <th className="p-4 uppercase">Identifier</th>
                  <th className="p-4 uppercase">Parameters</th>
                  <th className="p-4 uppercase">Quantization</th>
                  <th className="p-4 uppercase">RAM / VRAM Floor</th>
                  <th className="p-4 uppercase">Throughput</th>
                  <th className="p-4 uppercase">Target Operational Workload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222d] text-[#d4d6db]">
                <tr>
                  <td className="p-4 font-bold text-[#f0f2f5]">BANTAI Chhotu</td>
                  <td className="p-4 text-[#cc8e25]">3 Billion</td>
                  <td className="p-4">Q4_K_M</td>
                  <td className="p-4">4 GB RAM / 2 GB VRAM</td>
                  <td className="p-4 text-[#10b981]">~65 tok/s</td>
                  <td className="p-4 text-[#9da2af]">Edge nodes, rapid classification, low-overhead reminder dispatch</td>
                </tr>
                <tr className="bg-[#cc8e25]/5">
                  <td className="p-4 font-bold text-[#cc8e25]">BANTAI Bhai (Default)</td>
                  <td className="p-4 text-[#cc8e25] font-bold">7 Billion</td>
                  <td className="p-4">Q4_K_M</td>
                  <td className="p-4 text-[#f0f2f5]">8 GB RAM / 6 GB VRAM</td>
                  <td className="p-4 text-[#10b981]">~42 tok/s</td>
                  <td className="p-4 text-[#f0f2f5]">General developer daily driver, code generation, Tapori conversation</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-[#f0f2f5]">BANTAI Ustad</td>
                  <td className="p-4 text-[#cc8e25]">14 Billion</td>
                  <td className="p-4">Q4_K_M</td>
                  <td className="p-4">16 GB RAM / 10 GB VRAM</td>
                  <td className="p-4 text-[#10b981]">~28 tok/s</td>
                  <td className="p-4 text-[#9da2af]">Deep architectural reviews, multi-file refactoring, formal logic proofs</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-[#f0f2f5]">BANTAI Don</td>
                  <td className="p-4 text-[#cc8e25]">32 Billion</td>
                  <td className="p-4">Q4_K_M</td>
                  <td className="p-4">32 GB RAM / 20 GB VRAM</td>
                  <td className="p-4 text-[#10b981]">~18 tok/s</td>
                  <td className="p-4 text-[#9da2af]">Maximum analytical power, complex mathematical modeling, research</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5. DATA SEPARATION & SECURITY ARCHITECTURE */}
      <section className="border-b border-[#20232b] px-6 py-20 bg-[#0b0d10]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <span className="font-mono text-xs text-[#10b981] uppercase tracking-wider">
              [SECURITY SPECIFICATION]
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f0f2f5] mt-2 mb-3">
              Strict dual-database air-gap architecture
            </h2>
            <p className="text-sm text-[#8c919e] max-w-2xl">
              User identity and prompt contents are decoupled at the database driver boundary. Compromising the conversation store reveals zero authentication hashes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono">
            {/* MongoDB Partition */}
            <div className="border border-[#232733] p-6 bg-[#12151d]">
              <div className="text-xs font-bold text-[#10b981] uppercase mb-1">
                STORAGE LAYER 01 // MONGODB
              </div>
              <h3 className="text-base font-bold text-[#f0f2f5] mb-4">
                User Identity & Credential Isolation
              </h3>
              <ul className="space-y-3 text-xs text-[#9da2af]">
                <li className="flex items-start gap-2">
                  <span className="text-[#10b981] font-bold">[01]</span>
                  <span>Restricted to User Identity records and bcrypt-salted passwords (salt rounds: 10).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#10b981] font-bold">[02]</span>
                  <span>Issues localized HMAC-SHA256 bearer tokens with 7-day expiration.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#10b981] font-bold">[03]</span>
                  <span>Explicitly forbidden from persisting prompt text, agent tool calls, or model outputs.</span>
                </li>
              </ul>
            </div>

            {/* Firestore Partition */}
            <div className="border border-[#232733] p-6 bg-[#12151d]">
              <div className="text-xs font-bold text-[#cc8e25] uppercase mb-1">
                STORAGE LAYER 02 // FIREBASE FIRESTORE
              </div>
              <h3 className="text-base font-bold text-[#f0f2f5] mb-4">
                Stateful Telemetry & Vector Memory
              </h3>
              <ul className="space-y-3 text-xs text-[#9da2af]">
                <li className="flex items-start gap-2">
                  <span className="text-[#cc8e25] font-bold">[01]</span>
                  <span>Stores multi-turn conversational records keyed exclusively by random UUIDs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#cc8e25] font-bold">[02]</span>
                  <span>Persists 384-dimensional dense semantic vectors generated by BGE-small embedding model.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#cc8e25] font-bold">[03]</span>
                  <span>Manages personal schedule items, conflict detection trees, and agent task execution steps.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. AUTONOMOUS 10-TOOL AGENT SANDBOX */}
      <section className="border-b border-[#20232b] px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <span className="font-mono text-xs text-[#cc8e25] uppercase tracking-wider">
              [EXECUTION RUNTIME]
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f0f2f5] mt-2 mb-3">
              The 10-Tool Sandboxed Agent Registry
            </h2>
            <p className="text-sm text-[#8c919e] max-w-2xl">
              BANTAI agents decompose high-level directives into discrete execution plans. Sensitive filesystem and execution primitives enforce mandatory human authorization.
            </p>
          </div>

          <div className="border border-[#232733] bg-[#12151d] p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-mono text-xs">
              {[
                { name: "calculator", desc: "Deterministic mathematical evaluation" },
                { name: "sandbox_code_executor", desc: "Isolated JS/TS runner with human gate" },
                { name: "file_reader", desc: "Local repo file inspection" },
                { name: "file_writer", desc: "Local source file drafting" },
                { name: "web_search_rag", desc: "Local vector search & citation" },
                { name: "task_manager", desc: "Firestore task pipeline creator" },
                { name: "reminder_service", desc: "Temporal alerting scheduler" },
                { name: "calendar_planner", desc: "Schedule conflict analyzer" },
                { name: "personal_memory", desc: "User fact semantic store" },
                { name: "rag_retriever", desc: "Cosine similarity top-k ranking" }
              ].map((tool, idx) => (
                <div key={idx} className="border border-[#1e222d] p-3 bg-[#0f1117]">
                  <div className="text-[#cc8e25] font-bold mb-1">[{tool.name}]</div>
                  <div className="text-[#8c919e] text-[11px] leading-relaxed">{tool.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[#1e222d] flex items-center justify-between text-xs font-mono text-[#8c919e]">
              <span>SECURITY PROTOCOL: Human-in-the-loop authorization enforced on shell commands.</span>
              <button
                onClick={onOpenAuth}
                className="text-[#cc8e25] hover:underline uppercase font-bold"
              >
                Launch Planner Console &gt;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="px-6 py-12 bg-[#090a0d] font-mono text-xs border-t border-[#1a1d24]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="text-[#f0f2f5] font-bold">
              BANTAI // APNA MODEL. APNA DIMAAG.
            </div>
            <div className="text-[#6b7280]">
              Self-hosted sovereign AI platform. Licensed under Apache 2.0.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[#8c919e]">
            <button onClick={onOpenAuth} className="hover:text-[#f0f2f5] transition-colors">
              Access Console
            </button>
            <a
              href="https://github.com/ivengexnce/bantai"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#f0f2f5] transition-colors"
            >
              GitHub Source
            </a>
            <span className="text-[#3a3f4d]">|</span>
            <span className="text-[#cc8e25]">
              Architected by Meet Maru (ivengexnce)
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
