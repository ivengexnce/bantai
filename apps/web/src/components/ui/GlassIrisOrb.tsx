'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export interface GlassIrisOrbProps {
  size?: number; // default 270
  state?: 'idle' | 'processing' | 'generating' | 'speaking';
  interactive?: boolean;
}

export function GlassIrisOrb({
  size = 270,
  state = 'idle',
  interactive = true
}: GlassIrisOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let isRunning = true;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      if (!isRunning) return;

      const speed = state === 'generating' ? 2.6 : state === 'processing' ? 1.8 : state === 'speaking' ? 2.2 : 1.0;
      timeRef.current += prefersReducedMotion ? 0.003 : 0.015 * speed;
      const t = timeRef.current;

      const w = size;
      const h = size;
      const cx = w / 2;
      const cy = h / 2;
      const radius = (size / 2) * 0.86;

      ctx.clearRect(0, 0, w, h);

      // ==============================================================
      // 1. CLIP TO SPHERICAL GLASS BOUNDARY (Strict zero-box geometry)
      // ==============================================================
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // Deep dark cosmic cavity base with deep blue undertone
      const baseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      baseGrad.addColorStop(0, '#0d1326');
      baseGrad.addColorStop(0.45, '#070a16');
      baseGrad.addColorStop(0.85, '#04050a');
      baseGrad.addColorStop(1, '#020306');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, w, h);

      // ==============================================================
      // 2. CENTRAL SWIRLING PLASMA ENERGY VORTEX
      // ==============================================================
      const pulseAmplitude = state === 'processing' ? 14 : state === 'generating' ? 10 : state === 'speaking' ? 12 : 5;
      const corePulse = Math.sin(t * 2.4) * pulseAmplitude;
      const coreRadius = radius * 0.54 + corePulse;

      const mouseOffsetMagnitude = interactive ? 8 : 0;
      const coreX = cx + Math.sin(t * 1.1) * 6 + mouseRef.current.x * mouseOffsetMagnitude;
      const coreY = cy + Math.cos(t * 0.85) * 6 + mouseRef.current.y * mouseOffsetMagnitude;

      // Inner electric-blue & violet core glow
      const coreGrad = ctx.createRadialGradient(coreX, coreY, 2, coreX, coreY, coreRadius);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');   // Hyper-bright white center
      coreGrad.addColorStop(0.18, 'rgba(56, 189, 248, 0.92)'); // Radiant cyan
      coreGrad.addColorStop(0.42, 'rgba(47, 107, 255, 0.82)'); // Electric blue
      coreGrad.addColorStop(0.72, 'rgba(90, 76, 245, 0.65)');  // Deep violet
      coreGrad.addColorStop(0.92, 'rgba(124, 72, 240, 0.28)'); // Soft purple fringe
      coreGrad.addColorStop(1, 'rgba(10, 15, 30, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(coreX, coreY, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // ==============================================================
      // 3. MULTI-LAYERED SWIRLING FILAMENT WAVES & NEBULA ARCS
      // ==============================================================
      const filamentCount = state === 'generating' ? 8 : 6;
      for (let i = 0; i < filamentCount; i++) {
        const angle = t * 1.6 + (i * Math.PI * 2) / filamentCount;
        const orbitRadius = coreRadius * (0.65 + 0.3 * Math.sin(t * 1.2 + i));
        const px = cx + Math.cos(angle) * orbitRadius;
        const py = cy + Math.sin(angle * 1.1) * (orbitRadius * 0.88);

        const filamentGrad = ctx.createRadialGradient(px, py, 1, px, py, orbitRadius * 0.75);
        if (i % 2 === 0) {
          filamentGrad.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
          filamentGrad.addColorStop(0.4, 'rgba(47, 107, 255, 0.35)');
          filamentGrad.addColorStop(1, 'transparent');
        } else {
          filamentGrad.addColorStop(0, 'rgba(168, 85, 247, 0.65)');
          filamentGrad.addColorStop(0.4, 'rgba(90, 76, 245, 0.3)');
          filamentGrad.addColorStop(1, 'transparent');
        }

        ctx.fillStyle = filamentGrad;
        ctx.beginPath();
        ctx.arc(px, py, orbitRadius * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }

      // ==============================================================
      // 4. SECONDARY CHROMATIC CAUSTIC RAYS
      // ==============================================================
      const causticAngle = -t * 0.9;
      const causticX = cx + Math.cos(causticAngle) * (radius * 0.3);
      const causticY = cy + Math.sin(causticAngle) * (radius * 0.3);
      const causticGrad = ctx.createRadialGradient(causticX, causticY, 2, causticX, causticY, radius * 0.55);
      causticGrad.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
      causticGrad.addColorStop(0.5, 'rgba(47, 107, 255, 0.15)');
      causticGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = causticGrad;
      ctx.beginPath();
      ctx.arc(causticX, causticY, radius * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // ==============================================================
      // 5. INTERNAL GLASS CAUSTIC BOUNCE (Bottom Reflection Horizon)
      // ==============================================================
      const bounceY = cy + radius * 0.62;
      const bottomBounceGrad = ctx.createRadialGradient(cx, bounceY, 4, cx, bounceY, radius * 0.6);
      bottomBounceGrad.addColorStop(0, 'rgba(47, 107, 255, 0.5)');
      bottomBounceGrad.addColorStop(0.4, 'rgba(90, 76, 245, 0.25)');
      bottomBounceGrad.addColorStop(0.85, 'rgba(56, 189, 248, 0.08)');
      bottomBounceGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = bottomBounceGrad;
      ctx.beginPath();
      ctx.arc(cx, bounceY, radius * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // ==============================================================
      // 6. FRESNEL INNER GLASS RIM & CHROMATIC RING
      // ==============================================================
      const rimGrad = ctx.createRadialGradient(cx, cy, radius * 0.72, cx, cy, radius);
      rimGrad.addColorStop(0, 'rgba(47, 107, 255, 0)');
      rimGrad.addColorStop(0.65, 'rgba(47, 107, 255, 0.18)');
      rimGrad.addColorStop(0.88, 'rgba(56, 189, 248, 0.35)');
      rimGrad.addColorStop(0.96, 'rgba(255, 255, 255, 0.55)');
      rimGrad.addColorStop(1, 'rgba(124, 72, 240, 0.4)');

      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // End spherical clipping

      // ==============================================================
      // 7. EXTERIOR OPTICAL SPECULAR GLARE (Surface Glass Reflections)
      // ==============================================================
      // Top-left primary light bounce crescent
      const specX = cx - radius * 0.32;
      const specY = cy - radius * 0.42;
      const specGrad = ctx.createRadialGradient(specX, specY, 1, specX, specY, radius * 0.42);
      specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      specGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.65)');
      specGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
      specGrad.addColorStop(1, 'transparent');

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(specX, specY, radius * 0.36, radius * 0.2, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = specGrad;
      ctx.fill();
      ctx.restore();

      // Ultra-crisp top glass curvature highlight arc
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1, -Math.PI * 0.78, -Math.PI * 0.22);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();

      // Bottom-right subtle secondary light bounce
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1.5, Math.PI * 0.22, Math.PI * 0.58);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [size, state, interactive]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    mouseRef.current = { x, y };
  };

  const handleMouseLeave = () => {
    mouseRef.current = { x: 0, y: 0 };
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center justify-center select-none animate-float-subtle"
      style={{ width: size, height: size }}
    >
      {/* 1. Atmospheric Volumetric Blue Lighting shining from above */}
      <div
        className="absolute -top-24 inset-x-0 h-56 pointer-events-none rounded-full blur-[70px]"
        style={{
          background: 'radial-gradient(circle at 50% 25%, rgba(47, 107, 255, 0.32) 0%, rgba(90, 76, 245, 0.18) 45%, transparent 75%)'
        }}
      />

      {/* 2. Soft Ambient Aura Glow with Breathing Motion */}
      <motion.div
        animate={{
          scale: state === 'generating' || state === 'speaking' ? [1.04, 1.15, 1.04] : [1, 1.06, 1],
          opacity: state === 'generating' || state === 'speaking' ? [0.85, 1, 0.85] : [0.65, 0.85, 0.65]
        }}
        transition={{
          duration: state === 'generating' ? 1.8 : state === 'speaking' ? 2.2 : 5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="absolute inset-0 rounded-full pointer-events-none blur-[45px]"
        style={{
          background: 'radial-gradient(circle, rgba(47, 107, 255, 0.45) 0%, rgba(90, 76, 245, 0.28) 55%, transparent 80%)'
        }}
      />

      {/* 3. The 3D Glass Sphere Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="relative z-10 block pointer-events-none drop-shadow-[0_0_35px_rgba(47,107,255,0.4)]"
      />

      {/* 4. Floating Pedestal Soft Refraction Shadow underneath */}
      <div
        className="absolute -bottom-6 w-52 h-9 rounded-full pointer-events-none blur-xl"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(47, 107, 255, 0.4) 0%, rgba(90, 76, 245, 0.18) 50%, transparent 80%)'
        }}
      />
    </div>
  );
}
