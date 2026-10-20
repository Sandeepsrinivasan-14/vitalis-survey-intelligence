'use client';

import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'framer-motion';
import { useTheme } from 'next-themes';

// three.js + react-three-fiber live in their own chunk, fetched only when the
// hero is visible and the browser is idle. Never rendered on the server.
const HeroScene = dynamic(() => import('./hero-scene'), { ssr: false });

/** CSS-only 3D orb: SSR poster while the chunk loads, and the fallback without WebGL. */
function OrbFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
      <div className="orb w-[58%] [perspective:800px]" />
    </div>
  );
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <OrbFallback /> : this.props.children;
  }
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function HeroVisual({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const [load, setLoad] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || !webglAvailable()) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
          if (idle) idle(() => setLoad(true));
          else setTimeout(() => setLoad(true), 200);
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} role="img" aria-label="Rotating 3D network globe representing connected health centres">
      {load ? (
        <SceneBoundary>
          <HeroScene dark={resolvedTheme === 'dark'} animate={!reduced && visible} />
        </SceneBoundary>
      ) : (
        <OrbFallback />
      )}
    </div>
  );
}
