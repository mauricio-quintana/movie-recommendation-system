'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';

/**
 * Port of React Bits <TiltedCard /> as adapted in the Claude Design project:
 * motion/react springs are replaced by an equivalent spring loop (same stiffness,
 * damping and mass), so no animation library is needed. Sized with CSS
 * (aspect-ratio) instead of measuring, so it renders on the server without a flash.
 * The effect is disabled for reduced motion and touch-only devices.
 */

type SpringKey = 'rx' | 'ry' | 's' | 'op' | 'rc';
type Spring = [current: number, velocity: number, target: number];

// [stiffness, damping, mass] per animated value.
const CONFIG: Record<SpringKey, [number, number, number]> = {
  rx: [100, 30, 2],
  ry: [100, 30, 2],
  s: [100, 30, 2],
  op: [100, 10, 1],
  rc: [350, 30, 1],
};

interface TiltedCardProps {
  imageSrc: string | null;
  altText: string;
  captionText?: string;
  /** Height / width. Posters are 2:3. */
  ratio?: number;
  scaleOnHover?: number;
  rotateAmplitude?: number;
  showTooltip?: boolean;
  overlayContent?: ReactNode;
  sizes?: string;
  priority?: boolean;
  /** Makes the poster a link. The overlay stays outside it so it can hold buttons. */
  href?: string;
}

function motionAllowed(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function TiltedCard({
  imageSrc,
  altText,
  captionText = '',
  ratio = 1.5,
  scaleOnHover = 1.05,
  rotateAmplitude = 10,
  showTooltip = true,
  overlayContent,
  sizes = '(min-width: 1240px) 180px, (min-width: 760px) 20vw, 45vw',
  priority = false,
  href,
}: TiltedCardProps) {
  const figureRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLElement>(null);
  const sim = useRef({
    values: {
      rx: [0, 0, 0],
      ry: [0, 0, 0],
      s: [1, 0, 1],
      op: [0, 0, 0],
      rc: [0, 0, 0],
    } as Record<SpringKey, Spring>,
    x: 0,
    y: 0,
    lastY: 0,
    raf: 0,
    enabled: false,
  });

  useEffect(() => {
    const state = sim.current;
    state.enabled = motionAllowed();
    return () => cancelAnimationFrame(state.raf);
  }, []);

  const apply = () => {
    const { values: v, x, y } = sim.current;

    if (innerRef.current) {
      innerRef.current.style.transform = `rotateX(${v.rx[0]}deg) rotateY(${v.ry[0]}deg) scale(${v.s[0]})`;
    }

    if (captionRef.current) {
      captionRef.current.style.transform = `translate(${x}px, ${y}px) rotate(${v.rc[0]}deg)`;
      captionRef.current.style.opacity = String(v.op[0]);
    }
  };

  const step = () => {
    const state = sim.current;
    const dt = 1 / 60;
    let moving = false;

    for (const key of Object.keys(state.values) as SpringKey[]) {
      let [current, velocity] = state.values[key];
      const target = state.values[key][2];
      const [stiffness, damping, mass] = CONFIG[key];

      velocity += ((-stiffness * (current - target) - damping * velocity) / mass) * dt;
      current += velocity * dt;

      if (Math.abs(velocity) < 0.001 && Math.abs(current - target) < 0.001) {
        current = target;
        velocity = 0;
      } else {
        moving = true;
      }

      state.values[key] = [current, velocity, target];
    }

    apply();
    state.raf = moving ? requestAnimationFrame(step) : 0;
  };

  const animateTo = (key: SpringKey, target: number) => {
    const state = sim.current;
    state.values[key][2] = target;

    if (!state.raf) {
      state.raf = requestAnimationFrame(step);
    }
  };

  function handleMouseMove(event: MouseEvent<HTMLElement>) {
    const state = sim.current;

    if (!state.enabled || !figureRef.current) {
      return;
    }

    const rect = figureRef.current.getBoundingClientRect();
    const offsetX = event.clientX - rect.left - rect.width / 2;
    const offsetY = event.clientY - rect.top - rect.height / 2;

    animateTo('rx', (offsetY / (rect.height / 2)) * -rotateAmplitude);
    animateTo('ry', (offsetX / (rect.width / 2)) * rotateAmplitude);
    state.x = event.clientX - rect.left;
    state.y = event.clientY - rect.top;
    animateTo('rc', -(offsetY - state.lastY) * 0.6);
    state.lastY = offsetY;
    apply();
  }

  function handleMouseEnter() {
    if (!sim.current.enabled) {
      return;
    }

    animateTo('s', scaleOnHover);
    animateTo('op', 1);
  }

  function handleMouseLeave() {
    animateTo('op', 0);
    animateTo('s', 1);
    animateTo('rx', 0);
    animateTo('ry', 0);
    animateTo('rc', 0);
  }

  const poster = imageSrc ? (
    <Image
      src={imageSrc}
      alt={altText}
      fill
      sizes={sizes}
      priority={priority}
      className="rounded-[15px] object-cover [transform:translateZ(0)] will-change-transform"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center rounded-[15px] bg-[#2a2a2a] p-4 text-center font-mono text-xs text-[#d0d0d0]">
      {altText}
    </div>
  );

  return (
    <figure
      ref={figureRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative m-0 flex w-full items-center justify-center [perspective:800px]"
      style={{ aspectRatio: `1 / ${ratio}` }}
    >
      <div ref={innerRef} className="relative h-full w-full [transform-style:preserve-3d]">
        {href ? (
          // Duplicates the title link below, so it is skipped by keyboard and screen readers.
          <Link href={href} tabIndex={-1} aria-hidden="true" className="absolute inset-0 block">
            {poster}
          </Link>
        ) : (
          poster
        )}
        {overlayContent && (
          <div className="pointer-events-none absolute inset-0 z-[2] [transform:translateZ(30px)] will-change-transform">
            {overlayContent}
          </div>
        )}
      </div>
      {showTooltip && captionText && (
        <figcaption
          ref={captionRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-[3] rounded bg-white px-2.5 py-1 text-[10px] whitespace-nowrap text-[#2d2d2d] opacity-0 max-[640px]:hidden"
        >
          {captionText}
        </figcaption>
      )}
    </figure>
  );
}
