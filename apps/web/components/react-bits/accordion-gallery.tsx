'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import './accordion-gallery.css';

/**
 * Port of React Bits <AccordionGallery /> (GSAP) as adapted in the Claude Design
 * project: onActiveChange/onOpen callbacks and a controlled activeIndex. GSAP is
 * imported lazily on the client; before it loads the CSS already shows the layout.
 */

type Gsap = typeof import('gsap').gsap;
type Timeline = ReturnType<Gsap['timeline']>;

export interface AccordionItem {
  image: string | null;
  label: string;
  alt?: string;
  href?: string;
}

interface AccordionGalleryProps {
  items: AccordionItem[];
  defaultIndex?: number;
  /** Controlled active panel (e.g. an auto-cycling "processing" animation). */
  activeIndex?: number | null;
  height?: number;
  gap?: number;
  radius?: number;
  expandRatio?: number;
  duration?: number;
  ease?: string;
  parallax?: number;
  tilt?: number;
  stagger?: number;
  trigger?: 'hover' | 'click';
  showLabels?: boolean;
  grayscale?: boolean;
  overlayColor?: string;
  ariaLabel?: string;
  onActiveChange?: (index: number) => void;
}

function clampIndex(index: number, count: number) {
  return Math.min(Math.max(index, 0), Math.max(count - 1, 0));
}

export function AccordionGallery({
  items,
  defaultIndex = 0,
  activeIndex = null,
  height = 440,
  gap = 10,
  radius = 16,
  expandRatio = 0.52,
  duration = 0.6,
  ease = 'power3.out',
  parallax = 0.5,
  tilt = 8,
  stagger = 0.06,
  trigger = 'hover',
  showLabels = true,
  grayscale = true,
  overlayColor = '#0b0b0b',
  ariaLabel = 'Películas destacadas',
  onActiveChange,
}: AccordionGalleryProps) {
  const count = items.length;
  const [gsap, setGsap] = useState<Gsap | null>(null);
  const [active, setActive] = useState(() => clampIndex(defaultIndex, count));
  const [prevActiveIndex, setPrevActiveIndex] = useState(activeIndex);

  // Follow the controlled index when it changes (derived during render, not in an effect).
  if (activeIndex !== prevActiveIndex) {
    setPrevActiveIndex(activeIndex);
    if (activeIndex !== null && count > 0) {
      setActive(((activeIndex % count) + count) % count);
    }
  }

  const rootRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);
  const mediaRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const textRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const timelineRef = useRef<Timeline | null>(null);
  const firstRunRef = useRef(true);
  const mediaSizeRef = useRef(320);

  const ratio = Math.min(Math.max(expandRatio, 0.2), 0.9);
  const grow = count > 1 ? (ratio * (count - 1)) / (1 - ratio) : 1;

  useEffect(() => {
    let cancelled = false;

    void import('gsap').then(({ gsap: loaded }) => {
      if (!cancelled) {
        setGsap(() => loaded);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  const applyLayout = useCallback(
    (animate: boolean) => {
      const panels = panelRefs.current.slice(0, count);

      if (!gsap || panels.length === 0) {
        return;
      }

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const dur = animate && !reduced ? duration : 0;
      const mediaSize = mediaSizeRef.current;

      timelineRef.current?.kill();
      const timeline = gsap.timeline();

      panels.forEach((panel, index) => {
        if (!panel) {
          return;
        }

        const isActive = index === active;
        const rotateY = isActive ? 0 : index < active ? tilt : -tilt;
        const panelProps = { flexGrow: isActive ? grow : 1, rotateY };

        if (dur === 0) {
          gsap.set(panel, panelProps);
        } else {
          timeline.to(panel, { ...panelProps, duration: dur, ease }, 0);
        }

        const media = mediaRefs.current[index];

        if (media) {
          const drift = Math.max(-1.5, Math.min(1.5, active - index));
          const mediaProps = {
            xPercent: -50,
            yPercent: -50,
            x: isActive ? 0 : drift * parallax * mediaSize * 0.06,
            '--ag-gray': grayscale && !isActive ? 1 : 0,
            '--ag-dim': isActive ? 0 : 0.35,
          };

          if (dur === 0) {
            gsap.set(media, mediaProps);
          } else {
            timeline.to(media, { ...mediaProps, duration: dur, ease }, 0);
          }
        }

        const bar = barRefs.current[index];
        const text = textRefs.current[index];

        if (showLabels && bar && text) {
          const labelProps = isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -14 };

          if (dur === 0) {
            gsap.set([bar, text], labelProps);
          } else if (isActive) {
            timeline.to(
              [bar, text],
              { ...labelProps, duration: dur, ease, stagger: reduced ? 0 : stagger },
              0,
            );
          } else {
            timeline.to([bar, text], { ...labelProps, duration: dur * 0.6, ease }, 0);
          }
        }
      });

      timelineRef.current = timeline;
    },
    [gsap, active, count, grow, duration, ease, tilt, parallax, grayscale, showLabels, stagger],
  );

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const measure = () => {
      const usable = Math.max(root.getBoundingClientRect().width - gap * (count - 1), 120);
      const size = Math.max(140, usable * ratio * 1.22);
      mediaSizeRef.current = size;
      root.style.setProperty('--ag-media-size', `${size}px`);
      applyLayout(!firstRunRef.current);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);

    return () => observer.disconnect();
  }, [applyLayout, gap, count, ratio]);

  useEffect(() => {
    applyLayout(!firstRunRef.current);

    if (gsap) {
      firstRunRef.current = false;
    }
  }, [applyLayout, gsap]);

  useEffect(
    () => () => {
      timelineRef.current?.kill();
    },
    [],
  );

  function handleClick(index: number, event: MouseEvent) {
    // The first click expands a panel; clicking the expanded one follows its link.
    if (index !== active) {
      event.preventDefault();
      setActive(index);
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      panelRefs.current[(index + 1) % count]?.focus();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      panelRefs.current[(index - 1 + count) % count]?.focus();
    }
  }

  return (
    <div
      ref={rootRef}
      role="list"
      aria-label={ariaLabel}
      className="accordion-gallery"
      style={
        {
          '--ag-overlay': overlayColor,
          '--ag-gap': `${gap}px`,
          '--ag-radius': `${radius}px`,
          '--ag-active-grow': grow,
          height: `${height}px`,
        } as React.CSSProperties
      }
    >
      {items.map((item, index) => {
        const isActive = index === active;
        const className = `ag-panel${isActive ? ' ag-panel--active' : ''}`;
        const common = {
          ref: (element: HTMLElement | null) => {
            panelRefs.current[index] = element;
          },
          className,
          role: 'listitem',
          'aria-current': isActive ? ('true' as const) : undefined,
          'aria-label': item.label,
          onMouseEnter: () => trigger === 'hover' && setActive(index),
          onFocus: () => setActive(index),
          onKeyDown: (event: KeyboardEvent) => handleKeyDown(index, event),
        };
        const content = (
          <>
            <span className="ag-panel__frame">
              <span
                className="ag-panel__media"
                ref={(element) => {
                  mediaRefs.current[index] = element;
                }}
              >
                {item.image && (
                  <Image
                    src={item.image}
                    alt={item.alt ?? item.label}
                    fill
                    sizes="(min-width: 1240px) 700px, 60vw"
                    className="object-cover"
                    draggable={false}
                    priority={index === active}
                  />
                )}
              </span>
              <span className="ag-panel__overlay" aria-hidden="true" />
            </span>
            {showLabels && (
              <span className="ag-panel__label" aria-hidden="true">
                <span
                  className="ag-panel__bar"
                  ref={(element) => {
                    barRefs.current[index] = element;
                  }}
                />
                <span
                  className="ag-panel__text"
                  ref={(element) => {
                    textRefs.current[index] = element;
                  }}
                >
                  {item.label}
                </span>
              </span>
            )}
          </>
        );

        return item.href ? (
          <Link
            key={item.href}
            href={item.href}
            {...common}
            onClick={(event) => handleClick(index, event)}
          >
            {content}
          </Link>
        ) : (
          <div
            key={`${item.label}-${index}`}
            {...common}
            tabIndex={0}
            onClick={(event) => handleClick(index, event)}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
