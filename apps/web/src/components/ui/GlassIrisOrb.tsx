'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export interface GlassIrisOrbProps {
  size?: number; // default 260
  state?: 'idle' | 'processing' | 'generating';
  interactive?: boolean;
}

export function GlassIrisOrb({
  size = 260,
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

    // Support device pixel ratio for ultra-crisp retina rendering
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let isRunning = true;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      if (!isRunning) return;

      const speedFactor = state === 'generating' ? 2.4 : state === 'processing' ? 1.6 : 0.8;
      timeRef.current += prefersReducedMotion ? 0.002 : 0.012 * speedFactor;
      const t = timeRef.current;

      const w = size;
      const h = size;
      const cx = w / 2;
      const cy = h / 2;
      const radius = (size / 2) * 0.88;

      ctx.clearRect(0, 0, w, h);

      // 1. Clip everything strictly to the circular sphere boundary
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // Deep dark cosmic cavity base inside orb
      const baseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      baseGrad.addColorStop(0, '#0c1020');
      baseGrad.addColorStop(0.5, '#070a14');
      baseGrad.addColorStop(1, '#03050a');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Swirling Electric-Blue and Violet Energy Core
      const corePulse = Math.sin(t * 2.2) * (state === 'processing' ? 12 : 6);
      const coreRadius = radius * (0.48 + (state === 'generating' ? 0.08 : 0.04)) + corePulse;

      // Primary violet/electric-blue plasma core
      const coreX = cx + Math.sin(t * 0.9) * (state === 'generating' ? 10 : 4) + mouseRef.current.x * 6;
      const coreY = cy + Math.cos(t * 0.7) * (state === 'generating' ? 8 : 4) + mouseRef.current.y * 6;

      const coreGrad = ctx.createRadialGradient(coreX, coreY, 2, coreX, coreY, coreRadius);
      coreGrad.addColorStop(0, 'rgba(56, 189, 248, 0.95)'); // Cyan core center
      coreGrad.addColorStop(0.25, 'rgba(47, 107, 255, 0.85)'); // Electric blue
      coreGrad.addColorStop(0.6, 'rgba(90, 76, 245, 0.7)'); // Violet
      coreGrad.addColorStop(0.85, 'rgba(124, 72, 240, 0.35)'); // Soft purple edge
      coreGrad.addColorStop(1, 'rgba(14, 14, 25, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(coreX, coreY, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Swirling Internal Energy Filament Waves
      const waveCount = state === 'generating' ? 7 : 5;
      for (let i = 0; i < waveCount; i++) {
        const angle = t * 1.4 + (i * Math.PI * 2) / waveCount;
        const waveRadius = coreRadius * (0.6 + 0.35 * Math.sin(t + i));
        const px = cx + Math.cos(angle) * waveRadius;
        const py = cy + Math.sin(angle * 1.2) * waveRadius * 0.85;

        const filamentGrad = ctx.createRadialGradient(px, py, 1, px, py, waveRadius * 0.8);
        if (i % 2 === 0) {
          filamentGrad.addColorStop(0, 'rgba(47, 107, 255, 0.65)');
          filamentGrad.addColorStop(0.5, 'rgba(36, 83, 219, 0.3)');
          filamentGrad.addColorStop(1, 'transparent');
        } else {
          filamentGrad.addColorStop(0, 'rgba(124, 72, 240, 0.6)');
          filamentGrad.addColorStop(0.5, 'rgba(90, 76, 245, 0.25)');
          filamentGrad.addColorStop(1, 'transparent');
        }

        ctx.fillStyle = filamentGrad;
        ctx.beginPath();
        ctx.arc(px, py, waveRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Secondary Cyan Internal Refraction Highlights
      const cyanX = cx - Math.cos(t * 1.1) * (radius * 0.25);
      const cyanY = cy - Math.sin(t * 0.9) * (radius * 0.25);
      const cyanGrad = ctx.createRadialGradient(cyanX, cyanY, 1, cyanX, cyanY, radius * 0.45);
      cyanGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      cyanGrad.addColorStop(0.6, 'rgba(47, 107, 255, 0.15)');
      cyanGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = cyanGrad;
      ctx.beginPath();
      ctx.arc(cyanX, cyanY, radius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // 5. Internal Glass Caustic Bottom Bounce
      const bottomBounceGrad = ctx.createRadialGradient(
        cx,
        cy + radius * 0.65,
        radius * 0.1,
        cx,
        cy + radius * 0.65,
        radius * 0.55
      );
      bottomBounceGrad.addColorStop(0, 'rgba(47, 107, 255, 0.45)');
      bottomBounceGrad.addColorStop(0.5, 'rgba(90, 76, 245, 0.2)');
      bottomBounceGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = bottomBounceGrad;
      ctx.beginPath();
      ctx.arc(cx, cy + radius * 0.6, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // 6. Fresnel Edge Glow (Inner Glass Rim)
      const rimGrad = ctx.createRadialGradient(cx, cy, radius * 0.78, cx, cy, radius);
      rimGrad.addColorStop(0, 'rgba(47, 107, 255, 0)');
      rimGrad.addColorStop(0.7, 'rgba(47, 107, 255, 0.18)');
      rimGrad.addColorStop(0.92, 'rgba(255, 255, 255, 0.4)');
      rimGrad.addColorStop(1, 'rgba(124, 72, 240, 0.3)');

      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // Exit sphere clipping

      // 7. Outer Specular Highlights & Glare (on outer glass surface)
      // Top-left primary light bounce
      const specX = cx - radius * 0.28;
      const specY = cy - radius * 0.38;
      const specGrad = ctx.createRadialGradient(specX, specY, 1, specX, specY, radius * 0.5);
      specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      specGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.4)');
      specGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
      specGrad.addColorStop(1, 'transparent');

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(specX, specY, radius * 0.38, radius * 0.22, -Math.PI / 5, 0, Math.PI * 2);
      ctx.fillStyle = specGrad;
      ctx.fill();
      ctx.restore();

      // Top arc thin specular rim
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Bottom right subtle rim reflection
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1.5, Math.PI * 0.2, Math.PI * 0.6);
      ctx.strokeStyle = 'rgba(47, 107, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [size, state]);

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
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* 1. Atmospheric Radial Blue Lighting shining from above */}
      <div
        className="absolute -top-16 inset-x-0 h-48 pointer-events-none rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(47, 107, 255, 0.24) 0%, rgba(90, 76, 245, 0.12) 45%, transparent 70%)'
        }}
      />

      {/* 2. Soft Ambient Aura Glow around the Orb */}
      <motion.div
        animate={{
          scale: state === 'generating' ? [1.02, 1.08, 1.02] : [1, 1.04, 1],
          opacity: state === 'generating' ? [0.75, 0.95, 0.75] : [0.55, 0.7, 0.55]
        }}
        transition={{
          duration: state === 'generating' ? 2 : 4,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="absolute inset-2 rounded-full pointer-events-none blur-2xl"
        style={{
          background: 'radial-gradient(circle, rgba(47, 107, 255, 0.35) 0%, rgba(90, 76, 245, 0.2) 50%, transparent 75%)'
        }}
      />

      {/* 3. The 3D Glass Sphere Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="relative z-10 block pointer-events-none"
      />

      {/* 4. Floating Pedestal Soft Light / Shadow Reflection underneath */}
      <div
        className="absolute -bottom-5 w-44 h-8 rounded-full pointer-events-none blur-xl"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(47, 107, 255, 0.3) 0%, rgba(90, 76, 245, 0.1) 60%, transparent 80%)'
        }}
      />
    </div>
  );
}
