'use client';

/**
 * WebGL hero: a rotating "surveillance network" globe. Nodes sit on a sphere
 * (Fibonacci lattice), near neighbours are joined by hairlines, and a few
 * accent nodes pulse like active reporting centres. Loaded lazily by
 * HeroVisual; never imported on the server.
 */
import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SceneProps {
  dark: boolean;
  animate: boolean;
}

const NODE_COUNT = 150;
const RADIUS = 1.55;

function useNetwork() {
  return useMemo(() => {
    const points: THREE.Vector3[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < NODE_COUNT; i++) {
      const y = 1 - (i / (NODE_COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      points.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(RADIUS));
    }
    const segments: number[] = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        if (points[i].distanceTo(points[j]) < 0.5) {
          segments.push(points[i].x, points[i].y, points[i].z, points[j].x, points[j].y, points[j].z);
        }
      }
    }
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
    const hot = [7, 31, 58, 83, 109, 134];
    return { points, lineGeometry, hot };
  }, []);
}

function Globe({ dark, animate }: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const hotRefs = useRef<(THREE.Mesh | null)[]>([]);
  const { points, lineGeometry, hot } = useNetwork();

  const teal = dark ? '#2dd4bf' : '#0f766e';
  const violet = dark ? '#c4b5fd' : '#6d28d9';
  const amber = dark ? '#fbbf24' : '#d97706';

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    if (animate) {
      g.rotation.y += delta * 0.22;
      // Gentle pointer parallax.
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, state.pointer.y * 0.25, 0.05);
      g.position.x = THREE.MathUtils.lerp(g.position.x, state.pointer.x * 0.15, 0.05);
      const t = state.clock.elapsedTime;
      hotRefs.current.forEach((m, i) => {
        if (m) m.scale.setScalar(1 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.7)));
      });
    }
  });

  return (
    <group ref={group} rotation={[0.35, 0.6, 0]}>
      {/* Translucent core */}
      <mesh>
        <sphereGeometry args={[RADIUS * 0.97, 48, 48]} />
        <meshStandardMaterial color={teal} transparent opacity={dark ? 0.14 : 0.1} roughness={0.35} metalness={0.2} />
      </mesh>
      {/* Network edges */}
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color={teal} transparent opacity={dark ? 0.55 : 0.5} />
      </lineSegments>
      {/* Nodes */}
      {points.map((p, i) => {
        const isHot = hot.includes(i);
        return (
          <mesh
            key={i}
            position={p}
            ref={(m) => {
              if (isHot) hotRefs.current[hot.indexOf(i)] = m;
            }}
          >
            <sphereGeometry args={[isHot ? 0.055 : 0.028, 12, 12]} />
            <meshBasicMaterial color={isHot ? amber : i % 5 === 0 ? violet : teal} />
          </mesh>
        );
      })}
      {/* Orbit rings */}
      <mesh rotation={[Math.PI / 2.6, 0, 0]}>
        <torusGeometry args={[RADIUS * 1.28, 0.006, 8, 160]} />
        <meshBasicMaterial color={violet} transparent opacity={0.7} />
      </mesh>
      <mesh rotation={[Math.PI / 2.1, 0.5, 0.4]}>
        <torusGeometry args={[RADIUS * 1.5, 0.004, 8, 180]} />
        <meshBasicMaterial color={teal} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

export default function HeroScene({ dark, animate }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.6], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      // Reduced-motion users get one rendered frame instead of a render loop.
      frameloop={animate ? 'always' : 'demand'}
      aria-hidden="true"
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <Globe dark={dark} animate={animate} />
    </Canvas>
  );
}
