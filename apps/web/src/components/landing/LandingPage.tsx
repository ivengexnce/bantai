'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { SiliconMeshCanvas } from '../ui/SiliconMeshCanvas';
import { BorderBeam } from '../ui/BorderBeam';
import { NumberTicker } from '../ui/NumberTicker';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tabs } from '../ui/Tabs';
import { Skeleton, SkeletonMessageGroup } from '../ui/SkeletonLoader';
import { TerminalWindow } from './TerminalWindow';
import { TosModal, PrivacyModal } from './LegalModals';
import { FADE_IN_UP, STAGGER_CONTAINER } from '../../lib/utils';

export function LandingPage({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { user, setActiveView } = useApp();
  const [activeDemoMode, setActiveDemoMode] = useState<'tapori' | 'developer' | 'academic'>('tapori');
  const [selectedDemoModel, setSelectedDemoModel] = useState<string>('bhai');
  const [activeQueryIndex, setActiveQueryIndex] = useState<number>(0);
  const [customQueryInput, setCustomQueryInput] = useState<string>('');
  const [isSimulatingInference, setIsSimulatingInference] = useState<boolean>(false);
  const [showTos, setShowTos] = useState<boolean>(false);
  const [showPrivacy, setShowPrivacy] = useState<boolean>(false);

  const sampleQueries = [
    {
      q: "mera naam bta aur quicksort explain kar",
      tapori: "Arey bantai! Tera naam Bantai Explorer hai. Apun tere ko kaise bhulega bhidu? Tu hi toh apna asli hero hai.\n\nAb dekh QuickSort ka funda ekdum mast Mumbai style me samjhata hoon:\nSoch ek lambi bheed khadi hai ticket counter pe. Apun beech me se ek bande ko pakad ke Pivot bana dete hain (jaise Dadar station). Chhote number Dadar se pehle utrenge (left), bade number baad me (right). Isi ko bolte hain Divide and Conquer.\n\nAverage Time Complexity: O(N log N) - Express speed\nWorst Case: O(N^2) - Pivot galat chuna toh thoda slow",
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
    },
    {
      q: "mein sirf ek ladka hu",
      tapori: "Arre bantai! 'Sirf ek ladka' kya bolta hai re tu? Tu sher hai apun ka!\n\nMumbai ki sadkon se leke Silicon Valley tak, duniya ka har bada kissa ek aam ladke ke dimaag aur zid se hi shuru hota hai. Apun BANTAI tere dimaag aur mehnat pe poora bharosa karta hai bhidu!\n\nChahe coding karni ho, career ka plan banana ho ya life me bawaal machana ho: apun 24/7 tere sath khada hai. Chal bata, aaj apun dono milke kya naya start karein?",
      developer: "Identity acknowledged: Human operator. Potential unlimited. BANTAI sovereign tools (RAG, code execution, planning, memory) are fully at your command. State your operational objective.",
      academic: "Every major structural achievement begins with one focused individual. BANTAI is engineered to assist you with knowledge synthesis, computational modeling, and task execution. What domain shall we address today?"
    }
  ];

  const currentSample = sampleQueries[activeQueryIndex];
  const activeResponse = currentSample[activeDemoMode];

  const handleSelectQuery = (idx: number) => {
    setIsSimulatingInference(true);
    setActiveQueryIndex(idx);
    setTimeout(() => {
      setIsSimulatingInference(false);
    }, 380);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQueryInput.trim()) return;
    setIsSimulatingInference(true);
    setTimeout(() => {
      setIsSimulatingInference(false);
    }, 450);
  };

  const modeTabs = [
    { id: 'tapori', label: 'Tapori Mode' },
    { id: 'developer', label: 'Developer' },
    { id: 'academic', label: 'Academic' }
  ];

  const modelTabs = [
    { id: 'chhotu', label: 'Chhotu (3B)' },
    { id: 'bhai', label: 'Bhai (7B)' },
    { id: 'ustad', label: 'Ustad (14B)' },
    { id: 'don', label: 'Don (32B)' }
  ];

  return (
    <div
      className="min-h-screen bg-[#0d1117] text-[#d4d6db] font-mono text-xs antialiased selection:bg-[#f59e0b] selection:text-black relative overflow-x-hidden"
      style={{
        backgroundImage: 'radial-gradient(#263345 1.25px, transparent 1.25px)',
        backgroundSize: '24px 24px'
      }}
    >
      {/* Harsh High-Contrast Gradient Accent Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-rose-600 to-sky-600" />

      {/* Ambient Glowing Background Radial Orbs */}
      <div className="absolute top-16 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-10 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-32 left-10 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* 1. TOP UTILITY BAR */}
      <header className="border-b border-[#242e3f] bg-[#111620] px-6 py-3.5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs font-bold text-amber-400 tracking-wider uppercase">
              BANTAI // CORE 1.0
            </span>
            <span className="text-[#3b4758]">|</span>
            <span className="text-[#94a3b8] uppercase text-[11px]">
              SOVEREIGN SILICON RUNTIME
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 text-[11px] text-[#94a3b8]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              <span>DAEMON: LOCALHOST:4000</span>
            </div>

            <button
              onClick={() => setShowTos(true)}
              className="text-[#94a3b8] hover:text-[#f0f2f5] text-[11px] uppercase transition-colors hidden sm:inline"
            >
              TOS
            </button>
            <button
              onClick={() => setShowPrivacy(true)}
              className="text-[#94a3b8] hover:text-[#f0f2f5] text-[11px] uppercase transition-colors hidden sm:inline"
            >
              PRIVACY POLICY
            </button>

            {user ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveView('chat')}
                className="group"
              >
                <span>ENTER CONSOLE</span>
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1.5">➔</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenAuth}
                className="group"
              >
                <span>ACCESS CONSOLE</span>
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1.5">➔</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO: "IT'S NOT X, IT'S Y" MANIFESTO + INTERACTIVE CLI TERMINAL */}
      <section className="border-b border-[#242e3f] px-6 pt-16 pb-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Hero Manifesto */}
          <motion.div
            className="lg:col-span-6 space-y-6"
            initial="initial"
            animate="animate"
            variants={STAGGER_CONTAINER}
          >
            <motion.div variants={FADE_IN_UP}>
              <Badge variant="warning" pulse>
                SOVEREIGN LOCAL SILICON SPECIFICATION
              </Badge>
            </motion.div>

            {/* "IT'S NOT X, IT'S Y" Central Copy */}
            <motion.div variants={FADE_IN_UP} className="space-y-3">
              <div className="text-xs uppercase tracking-widest text-[#94a3b8] font-bold">
                THE SOVEREIGN PARADIGM
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#f0f2f5] leading-[1.18]">
                It&apos;s not another cloud AI API wrapper.
                <span className="block mt-2 bg-gradient-to-r from-amber-400 via-orange-500 to-sky-400 bg-clip-text text-transparent font-extrabold">
                  It&apos;s sovereign intelligence executed on your own local silicon.
                </span>
              </h1>
            </motion.div>

            <motion.p
              variants={FADE_IN_UP}
              className="text-xs text-[#94a3b8] leading-relaxed max-w-xl font-mono"
            >
              Zero external API egress. Strict dual-database isolation between user identity and conversation telemetry. Native model weights across 3B, 7B, 14B, and 32B with authentic Mumbai Tapori and technical reasoning engines.
            </motion.p>

            {/* Key Checkmark Bullets */}
            <motion.div variants={FADE_IN_UP} className="space-y-2 pt-1 text-xs text-[#d4d6db]">
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Zero cloud API egress: Prompts never leave your physical device</span>
              </div>
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Dual-database boundary: MongoDB auth hashes completely isolated from Firestore telemetry</span>
              </div>
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Autonomous 10-tool agent runtime with mandatory human confirmation gates</span>
              </div>
            </motion.div>

            {/* Action Buttons with Animated Arrows & Hover Transitions */}
            <motion.div variants={FADE_IN_UP} className="flex flex-wrap items-center gap-4 pt-3">
              {user ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setActiveView('chat')}
                  className="group"
                >
                  <span>LAUNCH OPERATIONAL CONSOLE</span>
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1.5 motion-safe:animate-pulse">➔</span>
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onOpenAuth}
                  className="group"
                >
                  <span>INITIALIZE INSTANCE</span>
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1.5 motion-safe:animate-pulse">➔</span>
                </Button>
              )}

              <a
                href="https://github.com/ivengexnce/bantai"
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="lg" className="group">
                  <span>INSPECT REPOSITORY SOURCE</span>
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">➔</span>
                </Button>
              </a>
            </motion.div>
          </motion.div>

          {/* Right Column: Live Interactive CLI Terminal Window */}
          <div className="lg:col-span-6 relative">
            <TerminalWindow />
          </div>
        </div>

        {/* Quick Metrics Matrix */}
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-[#242e3f] grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="p-4 rounded-xl border border-[#2b3648] bg-[#111620] hover:-translate-y-1 transition-all duration-200">
            <div className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1 font-bold">DATA EGRESS</div>
            <div className="text-2xl font-bold text-emerald-400 flex items-baseline gap-1">
              <NumberTicker value={0} />
              <span className="text-xs">BYTES</span>
            </div>
            <div className="text-[10px] text-[#94a3b8] mt-1">Air-gapped operation</div>
          </div>

          <div className="p-4 rounded-xl border border-[#2b3648] bg-[#111620] hover:-translate-y-1 transition-all duration-200">
            <div className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1 font-bold">LOCAL CONTEXT WINDOW</div>
            <div className="text-2xl font-bold text-amber-400 flex items-baseline gap-1">
              <NumberTicker value={32768} />
              <span className="text-xs">TOKENS</span>
            </div>
            <div className="text-[10px] text-[#94a3b8] mt-1">Qwen 2.5 full context</div>
          </div>

          <div className="p-4 rounded-xl border border-[#2b3648] bg-[#111620] hover:-translate-y-1 transition-all duration-200">
            <div className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1 font-bold">SANDBOXED AGENT TOOLS</div>
            <div className="text-2xl font-bold text-[#f0f2f5] flex items-baseline gap-1">
              <NumberTicker value={10} />
              <span className="text-xs">ACTIVE</span>
            </div>
            <div className="text-[10px] text-[#94a3b8] mt-1">Human approval gates</div>
          </div>

          <div className="p-4 rounded-xl border border-[#2b3648] bg-[#111620] hover:-translate-y-1 transition-all duration-200">
            <div className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1 font-bold">MODEL FAMILY TIERS</div>
            <div className="text-2xl font-bold text-[#f0f2f5] flex items-baseline gap-1">
              <NumberTicker value={4} />
              <span className="text-xs">MODELS</span>
            </div>
            <div className="text-[10px] text-[#94a3b8] mt-1">3B, 7B, 14B, 32B weights</div>
          </div>
        </div>
      </section>

      {/* 3. DEDICATED MANIFESTO BREAKDOWN: "IT'S NOT X, IT'S Y" COMPARATIVE GRID */}
      <section className="border-b border-[#242e3f] px-6 py-16 bg-[#0f141d]">
        <div className="max-w-7xl mx-auto space-y-10">
          <div>
            <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">
              [ARCHITECTURAL MANIFESTO]
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f0f2f5] mt-1 mb-2">
              Four fundamental architectural contrasts
            </h2>
            <p className="text-xs text-[#94a3b8] max-w-2xl font-mono">
              Why sovereignty on local silicon outperforms commercial third-party cloud API wrappers.
            </p>
          </div>

          {/* Comparative Stacked Sections (No feature cards in a row!) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Privacy */}
            <div className="p-6 rounded-2xl border border-[#2b3648] bg-[#151c28] hover:-translate-y-1 transition-all duration-200 space-y-3">
              <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                IT&apos;S NOT CORPORATE SURVEILLANCE
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Cloud AI services record every conversation, inspect corporate tokens, and feed user questions into proprietary retraining loops behind closed doors.
              </p>
              <div className="pt-2 border-t border-[#242e3f]">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>IT&apos;S 100% PRIVATE LOCAL EXECUTION</span>
                </div>
                <p className="text-xs text-[#d4d6db] leading-relaxed">
                  BANTAI runs on your local GPU/CPU. When you unplug your internet cable, every model, task planner, and memory vector continues executing flawlessly.
                </p>
              </div>
            </div>

            {/* Card 2: Dialect & Intelligence */}
            <div className="p-6 rounded-2xl border border-[#2b3648] bg-[#151c28] hover:-translate-y-1 transition-all duration-200 space-y-3">
              <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                IT&apos;S NOT ROBOTIC CORPORATE DIALOGUE
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Generic cloud assistants output sterilized, clinical corporate disclaimers that fail to connect with colloquial cultural nuances or street-smart developers.
              </p>
              <div className="pt-2 border-t border-[#242e3f]">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>IT&apos;S AUTHENTIC MUMBAI TAPORI + TECHNICAL LOGIC</span>
                </div>
                <p className="text-xs text-[#d4d6db] leading-relaxed">
                  Real Mumbai slang calibrated alongside deep CS theory. Switch instantly between Tapori swagger, strict Developer rigor, and Academic pedagogy.
                </p>
              </div>
            </div>

            {/* Card 3: Storage */}
            <div className="p-6 rounded-2xl border border-[#2b3648] bg-[#151c28] hover:-translate-y-1 transition-all duration-200 space-y-3">
              <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                IT&apos;S NOT A SINGLE UNPROTECTED DATABASE
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Most AI apps dump user emails, password hashes, and sensitive conversation histories into a single table, risking catastrophic data leaks.
              </p>
              <div className="pt-2 border-t border-[#242e3f]">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>IT&apos;S AIR-GAPPED DUAL-DATABASE SEPARATION</span>
                </div>
                <p className="text-xs text-[#d4d6db] leading-relaxed">
                  MongoDB handles auth credentials; Firestore handles chat and memory vectors. Decoupled at the driver layer to prevent cross-collection leakage.
                </p>
              </div>
            </div>

            {/* Card 4: Agents */}
            <div className="p-6 rounded-2xl border border-[#2b3648] bg-[#151c28] hover:-translate-y-1 transition-all duration-200 space-y-3">
              <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                IT&apos;S NOT A PASSIVE CHATBOT WRAPPER
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Standard chatbots are limited to answering static queries and cannot interact with local files, run calculations, or schedule temporal alerts.
              </p>
              <div className="pt-2 border-t border-[#242e3f]">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>IT&apos;S A 10-TOOL AUTONOMOUS AGENT RUNTIME</span>
                </div>
                <p className="text-xs text-[#d4d6db] leading-relaxed">
                  Equipped with deterministic tools including safe sandbox code runners, file readers/writers, vector RAG search, calendar conflict solvers, and task planners.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. REAL PRODUCT DEMONSTRATION WITH SKELETON LOADERS & TABS */}
      <section className="border-b border-[#242e3f] px-6 py-16 bg-[#111620]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">
              [LIVE EVALUATION ENVIRONMENT]
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f0f2f5] mt-1 mb-2">
              Interactive local dialogue demonstration
            </h2>
            <p className="text-xs text-[#94a3b8] max-w-2xl font-mono">
              Test actual runtime queries below to observe the dual-engine dialogue generator. Select an operational personality mode to switch between authentic Mumbai Tapori, Developer, and Academic outputs.
            </p>
          </div>

          <div className="rounded-2xl border border-[#2b3648] bg-[#151c28] overflow-hidden relative">
            <BorderBeam size={250} duration={14} color="#f59e0b" />

            {/* Console Control Bar with Sliding Animated Tabs */}
            <div className="border-b border-[#242e3f] p-4 flex flex-wrap items-center justify-between gap-4 bg-[#111620]">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[#94a3b8] uppercase font-bold">[MODEL]:</span>
                <Tabs
                  tabs={modelTabs}
                  activeTab={selectedDemoModel}
                  onChange={setSelectedDemoModel}
                  layoutId="landing-model-tab"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[#94a3b8] uppercase font-bold">[MODE]:</span>
                <Tabs
                  tabs={modeTabs}
                  activeTab={activeDemoMode}
                  onChange={id => setActiveDemoMode(id as 'tapori' | 'developer' | 'academic')}
                  layoutId="landing-mode-tab"
                />
              </div>
            </div>

            {/* Query Selector Bar */}
            <div className="border-b border-[#242e3f] px-4 py-2.5 flex flex-wrap gap-2 bg-[#0d1117]">
              {sampleQueries.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectQuery(idx)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg transition-all uppercase font-bold border ${
                    activeQueryIndex === idx
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                      : 'bg-[#151c28] text-[#94a3b8] hover:text-[#f0f2f5] border-[#242e3f]'
                  }`}
                >
                  QUERY [{idx + 1}]: &quot;{item.q.substring(0, 26)}...&quot;
                </button>
              ))}
            </div>

            {/* Conversation Runner Body */}
            <div className="p-6 space-y-6">
              {/* Operator Query Block */}
              <div className="p-4 rounded-xl border border-[#2b3648] bg-[#111620] space-y-1">
                <div className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">
                  OPERATOR QUERY:
                </div>
                <div className="text-sm text-[#f0f2f5] font-bold">
                  &quot;{currentSample.q}&quot;
                </div>
              </div>

              {/* Skeleton Loader during inference transition */}
              <AnimatePresence mode="wait">
                {isSimulatingInference ? (
                  <motion.div
                    key="skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <SkeletonMessageGroup />
                  </motion.div>
                ) : (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="p-5 rounded-xl border border-[#2b3648] bg-[#0d1117] space-y-3"
                  >
                    <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider flex items-center justify-between border-b border-[#242e3f] pb-2 font-bold">
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        BANTAI RESPONSE // MODE: {activeDemoMode.toUpperCase()}
                      </span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-emerald-400 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        STATUS: 200 OK LOCAL
                      </span>
                    </div>

                    <div className="text-xs text-[#d4d6db] leading-relaxed whitespace-pre-wrap font-mono">
                      {activeResponse}
                    </div>

                    <div className="pt-2 border-t border-[#242e3f] flex items-center justify-between text-[10px] text-[#64748b]">
                      <span>MODEL: {selectedDemoModel.toUpperCase()} (LOCAL WEIGHTS)</span>
                      <span>INFERENCE LATENCY: 14MS · DATA SENT: 0 BYTES</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Custom Prompt Interactive Input */}
              <form onSubmit={handleCustomSubmit} className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={customQueryInput}
                  onChange={e => setCustomQueryInput(e.target.value)}
                  placeholder="Test custom query in live evaluation runner..."
                  className="flex-1 bg-[#111620] border border-[#2b3648] px-4 py-2.5 rounded-lg text-xs text-[#f0f2f5] placeholder-[#64748b] focus:outline-none focus:border-amber-500 font-mono"
                />
                <Button variant="primary" size="md" type="submit" className="group">
                  <span>EXECUTE</span>
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">➔</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MODEL FAMILY SPECIFICATION MATRIX */}
      <section className="border-b border-[#242e3f] px-6 py-16 bg-[#0f141d]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">
              [COMPUTE ARCHITECTURE]
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f0f2f5] mt-1 mb-2">
              The BANTAI Model Family specification matrix
            </h2>
            <p className="text-xs text-[#94a3b8] max-w-2xl font-mono">
              Each model is calibrated for sovereign execution across distinct physical compute envelopes. Zero third-party license restrictions.
            </p>
          </div>

          <div className="rounded-2xl border border-[#2b3648] overflow-hidden bg-[#151c28]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111620] border-b border-[#242e3f] text-[#94a3b8]">
                <tr>
                  <th className="p-4 uppercase font-bold">Identifier</th>
                  <th className="p-4 uppercase font-bold">Parameters</th>
                  <th className="p-4 uppercase font-bold">Quantization</th>
                  <th className="p-4 uppercase font-bold">RAM / VRAM Floor</th>
                  <th className="p-4 uppercase font-bold">Throughput</th>
                  <th className="p-4 uppercase font-bold">Target Operational Workload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242e3f] text-[#d4d6db]">
                <tr className="hover:bg-[#1a2332] transition-colors">
                  <td className="p-4 font-bold text-[#f0f2f5]">BANTAI Chhotu</td>
                  <td className="p-4 text-amber-400 font-bold">3 Billion</td>
                  <td className="p-4">Q4_K_M</td>
                  <td className="p-4">4 GB RAM / 2 GB VRAM</td>
                  <td className="p-4 text-emerald-400 font-bold">~65 tok/s</td>
                  <td className="p-4 text-[#94a3b8]">Edge nodes, rapid classification, low-overhead reminder dispatch</td>
                </tr>
                <tr className="bg-amber-500/10 hover:bg-amber-500/15 transition-colors">
                  <td className="p-4 font-bold text-amber-400">BANTAI Bhai (Default)</td>
                  <td className="p-4 text-amber-400 font-bold">7 Billion</td>
                  <td className="p-4">Q4_K_M</td>
                  <td className="p-4 text-[#f0f2f5] font-bold">8 GB RAM / 6 GB VRAM</td>
                  <td className="p-4 text-emerald-400 font-bold">~42 tok/s</td>
                  <td className="p-4 text-[#f0f2f5]">General developer daily driver, code generation, Tapori conversation</td>
                </tr>
                <tr className="hover:bg-[#1a2332] transition-colors">
                  <td className="p-4 font-bold text-[#f0f2f5]">BANTAI Ustad</td>
                  <td className="p-4 text-amber-400 font-bold">14 Billion</td>
                  <td className="p-4">Q4_K_M</td>
                  <td className="p-4">16 GB RAM / 10 GB VRAM</td>
                  <td className="p-4 text-emerald-400 font-bold">~28 tok/s</td>
                  <td className="p-4 text-[#94a3b8]">Deep architectural reviews, multi-file refactoring, formal logic proofs</td>
                </tr>
                <tr className="hover:bg-[#1a2332] transition-colors">
                  <td className="p-4 font-bold text-[#f0f2f5]">BANTAI Don</td>
                  <td className="p-4 text-amber-400 font-bold">32 Billion</td>
                  <td className="p-4">Q4_K_M</td>
                  <td className="p-4">32 GB RAM / 20 GB VRAM</td>
                  <td className="p-4 text-emerald-400 font-bold">~18 tok/s</td>
                  <td className="p-4 text-[#94a3b8]">Maximum analytical power, complex mathematical modeling, research</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. DATA SEPARATION & SECURITY ARCHITECTURE */}
      <section className="border-b border-[#242e3f] px-6 py-16 bg-[#111620]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">
              [SECURITY SPECIFICATION]
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f0f2f5] mt-1 mb-2">
              Strict dual-database air-gap architecture
            </h2>
            <p className="text-xs text-[#94a3b8] max-w-2xl font-mono">
              User identity and prompt contents are decoupled at the database driver boundary. Compromising the conversation store reveals zero authentication hashes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* MongoDB Partition */}
            <div className="p-6 rounded-2xl border border-[#2b3648] bg-[#151c28] hover:-translate-y-1 transition-all duration-200 space-y-4">
              <div className="text-[10px] font-bold text-emerald-400 uppercase">
                STORAGE LAYER 01 // MONGODB
              </div>
              <h3 className="text-sm font-bold text-[#f0f2f5]">
                User Identity & Credential Isolation
              </h3>
              <ul className="space-y-3 text-xs text-[#94a3b8]">
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Restricted to User Identity records and bcrypt-salted passwords (salt rounds: 10).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Issues localized HMAC-SHA256 bearer tokens with 7-day expiration.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Explicitly forbidden from persisting prompt text, agent tool calls, or model outputs.</span>
                </li>
              </ul>
            </div>

            {/* Firestore Partition */}
            <div className="p-6 rounded-2xl border border-[#2b3648] bg-[#151c28] hover:-translate-y-1 transition-all duration-200 space-y-4">
              <div className="text-[10px] font-bold text-amber-400 uppercase">
                STORAGE LAYER 02 // FIREBASE FIRESTORE
              </div>
              <h3 className="text-sm font-bold text-[#f0f2f5]">
                Stateful Telemetry & Vector Memory
              </h3>
              <ul className="space-y-3 text-xs text-[#94a3b8]">
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Stores multi-turn conversational records keyed exclusively by random UUIDs.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Persists 384-dimensional dense semantic vectors generated by BGE-small embedding model.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Manages personal schedule items, conflict detection trees, and agent task execution steps.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7. ONE-COMMAND SOVEREIGN DEPLOYMENT (NO 3 PRICING TIERS) */}
      <section className="border-b border-[#242e3f] px-6 py-16 bg-[#0f141d]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">
              [OPEN-SOURCE DEPLOYMENT]
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f0f2f5] mt-1 mb-2">
              Deploy your own sovereign node in seconds
            </h2>
            <p className="text-xs text-[#94a3b8] max-w-2xl font-mono">
              Zero subscription fees. Zero cloud billing accounts. Free and open source under Apache 2.0.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[#2b3648] bg-[#151c28] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#f0f2f5]">QUICKSTART ONE-LINER</span>
                <p className="text-xs text-[#94a3b8] mt-0.5">Clones the repo, installs dependencies, and boots the backend and web servers.</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText("git clone https://github.com/ivengexnce/bantai.git && cd bantai && npm run setup && npm run dev");
                }}
                className="px-3 py-1.5 rounded-lg border border-[#2b3648] bg-[#111620] hover:bg-[#1a2332] text-xs font-bold text-amber-400 uppercase transition-colors shrink-0"
              >
                COPY COMMAND
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#0d1117] border border-[#242e3f] text-emerald-400 font-mono text-xs overflow-x-auto select-all">
              git clone https://github.com/ivengexnce/bantai.git &amp;&amp; cd bantai &amp;&amp; npm run setup &amp;&amp; npm run dev
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="flex items-center gap-2 text-[#94a3b8]">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Node.js v20+ &amp; npm workspaces</span>
              </div>
              <div className="flex items-center gap-2 text-[#94a3b8]">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Ollama or local offline engine</span>
              </div>
              <div className="flex items-center gap-2 text-[#94a3b8]">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>100% Apache 2.0 open source</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOOTER WITH TOS, PRIVACY POLICY & REPO LINKS */}
      <footer className="px-6 py-12 bg-[#0b0e14] text-xs border-t border-[#242e3f]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="text-[#f0f2f5] font-bold">
              BANTAI // APNA MODEL. APNA DIMAAG.
            </div>
            <div className="text-[#64748b]">
              Self-hosted sovereign AI platform. Licensed under Apache 2.0.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[#94a3b8]">
            <button
              onClick={() => setShowTos(true)}
              className="hover:text-[#f0f2f5] transition-colors uppercase font-bold"
            >
              TERMS OF SERVICE
            </button>
            <button
              onClick={() => setShowPrivacy(true)}
              className="hover:text-[#f0f2f5] transition-colors uppercase font-bold"
            >
              PRIVACY POLICY
            </button>
            <a
              href="https://github.com/ivengexnce/bantai"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#f0f2f5] transition-colors uppercase font-bold"
            >
              GITHUB SOURCE
            </a>
            <span className="text-[#3b4758]">|</span>
            <span className="text-amber-400 uppercase font-bold">
              Architected by Meet Maru (ivengexnce)
            </span>
          </div>
        </div>
      </footer>

      {/* Interactive TOS & Privacy Modals */}
      <TosModal isOpen={showTos} onClose={() => setShowTos(false)} />
      <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
}
