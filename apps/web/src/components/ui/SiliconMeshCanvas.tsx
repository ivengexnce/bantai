'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface SiliconMeshCanvasProps {
  className?: string;
  activeModelName?: string;
}

export function SiliconMeshCanvas({
  className,
  activeModelName = 'BANTAI BHAI 7B'
}: SiliconMeshCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    // Check for prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setWebglSupported(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power'
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.5, 5);
    camera.lookAt(0, 0, 0);

    // 1. Silicon Substrate Plate
    const chipGeo = new THREE.BoxGeometry(2.4, 0.08, 2.4);
    const chipMat = new THREE.MeshBasicMaterial({
      color: 0x141820,
      wireframe: false
    });
    const chip = new THREE.Mesh(chipGeo, chipMat);
    scene.add(chip);

    // 2. Hairline Grid Edges (Amber)
    const edges = new THREE.EdgesGeometry(chipGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xcc8e25,
      transparent: true,
      opacity: 0.8
    });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    scene.add(wireframe);

    // 3. Neural Lattice Points (Matrix Green / Amber)
    const pointCount = 144;
    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);

    let idx = 0;
    const gridSize = 12;
    const spacing = 0.18;
    const offset = ((gridSize - 1) * spacing) / 2;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        positions[idx * 3] = i * spacing - offset;
        positions[idx * 3 + 1] = 0.08 + (Math.sin(i * 0.8) * Math.cos(j * 0.8) * 0.05);
        positions[idx * 3 + 2] = j * spacing - offset;

        // Color gradient from Amber to Matrix Green
        if ((i + j) % 3 === 0) {
          colors[idx * 3] = 0.8;     // R
          colors[idx * 3 + 1] = 0.55; // G (Amber)
          colors[idx * 3 + 2] = 0.15; // B
        } else {
          colors[idx * 3] = 0.06;     // R
          colors[idx * 3 + 1] = 0.72; // G (Emerald)
          colors[idx * 3 + 2] = 0.5;  // B
        }
        idx++;
      }
    }

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pointMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.95
    });

    const points = new THREE.Points(pointGeo, pointMat);
    scene.add(points);

    // 4. Subtle Interactive Mouse Reactivity
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationY = 0;
    let targetRotationX = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX = x * 0.8;
      mouseY = y * 0.5;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // 5. Visibility Observer to halt rendering when out of viewport
    let isVisible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const elapsedTime = clock.getElapsedTime();

      // Ambient idle rotation
      targetRotationY = elapsedTime * 0.25 + mouseX;
      targetRotationX = 0.2 + mouseY * 0.3;

      chip.rotation.y += (targetRotationY - chip.rotation.y) * 0.05;
      chip.rotation.x += (targetRotationX - chip.rotation.x) * 0.05;

      wireframe.rotation.copy(chip.rotation);
      points.rotation.copy(chip.rotation);

      // Subtle pulse on points
      pointMat.size = 0.045 + Math.sin(elapsedTime * 2.5) * 0.008;

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      chipGeo.dispose();
      pointGeo.dispose();
      lineMat.dispose();
      chipMat.dispose();
      pointMat.dispose();
    };
  }, []);

  return (
    <div className={className}>
      <div className="relative w-full h-full border border-[#20232b] bg-[#0c0e12] overflow-hidden">
        {/* Monospace telemetry badges */}
        <div className="absolute top-2.5 left-3 z-10 flex items-center gap-2 pointer-events-none text-[9px] font-mono text-[#8c919e]">
          <span className="w-1.5 h-1.5 bg-[#10b981] inline-block animate-pulse" />
          <span>SILICON LATTICE: {activeModelName}</span>
        </div>

        <div className="absolute top-2.5 right-3 z-10 text-[9px] font-mono text-[#cc8e25] pointer-events-none">
          [144 COMPUTE NODES]
        </div>

        {webglSupported ? (
          <div ref={mountRef} className="w-full h-full" />
        ) : (
          // Static, accessible 2D Fallback for low-power or reduced-motion
          <div className="w-full h-full flex items-center justify-center p-6 text-center">
            <div className="border border-[#2b303c] p-4 bg-[#12141a] space-y-1 font-mono text-xs">
              <span className="text-[#cc8e25] font-bold">[SOVEREIGN SILICON CORE]</span>
              <p className="text-[10px] text-[#8c919e]">
                100% On-Device Neural Pipeline · Hardware Accelerated Execution
              </p>
            </div>
          </div>
        )}

        <div className="absolute bottom-2.5 left-3 z-10 text-[9px] font-mono text-[#5a6070] pointer-events-none">
          INTERACTIVE 3D · ROTATION REACTIVE
        </div>
      </div>
    </div>
  );
}
