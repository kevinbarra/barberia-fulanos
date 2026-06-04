"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Star, ArrowRight, Scissors } from "lucide-react";

/**
 * Deterministic pseudo-random based on seed.
 * Used to generate consistent per-character animation values.
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

interface CharAnimData {
  char: string;
  dx: number;   // horizontal drift (px)
  dy: number;   // vertical drift (px) — positive = downward like falling hair
  rotation: number;
  delay: number; // stagger factor 0–1
}

interface ParticleData {
  x: number;       // % origin X
  y: number;       // % origin Y
  dx: number;      // drift X
  dy: number;      // drift Y (downward)
  width: number;   // px
  height: number;  // px — shorter than width = elongated like hair clipping
  rotation: number;
  delay: number;
  colorType: number; // 0=brand blue, 1=dark, 2=gray
}

/**
 * HeroDissolve — "The Barber's Snap"
 * 
 * Scroll-driven hero section where the heading text dissolves into
 * hair-clipping-like particles as the user scrolls past.
 * 
 * Each character fragments individually with staggered timing.
 * Small decorative particles (styled as elongated hair snippets)
 * float and fall around the dissolving text.
 * 
 * ⚡ PERF: Only uses transform + opacity (GPU-composited).
 * ♿ A11Y: Respects prefers-reduced-motion; sr-only text for screen readers.
 */
export default function HeroDissolve({ whatsappUrl }: { whatsappUrl: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rafRef = useRef<number>(0);

  // Detect prefers-reduced-motion and screen size for performance
  useEffect(() => {
    const mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    
    const checkMotionPreference = () => {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      setReducedMotion(mq ? mq.matches || isMobile : isMobile);
    };

    // Initial check
    checkMotionPreference();

    const handler = (e: MediaQueryListEvent) => {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      setReducedMotion(e.matches || isMobile);
    };

    // Safe event listener registration for older Safari/WebViews (iOS < 14)
    if (mq) {
      if (mq.addEventListener) {
        mq.addEventListener("change", handler);
      } else if (mq.addListener) {
        mq.addListener(handler);
      }
    }

    // Dynamic adaptation on resize (e.g. tablet rotation)
    window.addEventListener("resize", checkMotionPreference);

    return () => {
      if (mq) {
        if (mq.removeEventListener) {
          mq.removeEventListener("change", handler);
        } else if (mq.removeListener) {
          mq.removeListener(handler);
        }
      }
      window.removeEventListener("resize", checkMotionPreference);
    };
  }, []);

  // Scroll progress tracker
  useEffect(() => {
    if (reducedMotion) return;

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!sectionRef.current) return;
        const rect = sectionRef.current.getBoundingClientRect();
        const sectionHeight = sectionRef.current.offsetHeight;
        // ⚡ REGRESION DE RENDIMIENTO: Evita división por cero y NaN si el elemento aún no tiene altura (offsetHeight = 0)
        const divisor = sectionHeight * 0.5;
        const p = divisor > 0 ? Math.max(0, Math.min(1, -rect.top / divisor)) : 0;
        setProgress(isNaN(p) ? 0 : p);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  // ── Character animation data ──
  const line1 = "Domina tu agenda.";
  const line2 = "Sin esfuerzo.";

  const chars1: CharAnimData[] = useMemo(() =>
    line1.split("").map((char, i) => ({
      char,
      dx: (seededRandom(i * 7 + 1) - 0.3) * 180,
      dy: seededRandom(i * 7 + 2) * 140 + 50,      // falls down
      rotation: (seededRandom(i * 7 + 3) - 0.5) * 140,
      delay: (i / line1.length) * 0.35,              // left-to-right stagger
    })), []
  );

  const chars2: CharAnimData[] = useMemo(() =>
    line2.split("").map((char, i) => ({
      char,
      dx: (seededRandom((i + 50) * 7 + 1) - 0.3) * 220,
      dy: seededRandom((i + 50) * 7 + 2) * 170 + 60,
      rotation: (seededRandom((i + 50) * 7 + 3) - 0.5) * 160,
      delay: (i / line2.length) * 0.28 + 0.12,       // slightly later than line 1
    })), []
  );

  // ── Hair clipping particles ──
  const particles: ParticleData[] = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => {
      const size = seededRandom(i * 17 + 5) * 7 + 2;
      const aspect = seededRandom(i * 17 + 8) * 2.5 + 1.5; // elongated
      return {
        x: seededRandom(i * 17 + 1) * 80 + 10,
        y: seededRandom(i * 17 + 2) * 50 + 25,
        dx: (seededRandom(i * 17 + 3) - 0.45) * 280,
        dy: seededRandom(i * 17 + 4) * 200 + 40,
        width: size,
        height: Math.max(1.5, size / aspect),
        rotation: seededRandom(i * 17 + 6) * 360,
        delay: seededRandom(i * 17 + 7) * 0.5,
        colorType: i % 3,
      };
    }), []
  );

  // ── Floating scissor sparkles (small ✂ icons) ──
  const sparkles = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      x: seededRandom(i * 31 + 10) * 70 + 15,
      y: seededRandom(i * 31 + 11) * 40 + 30,
      dx: (seededRandom(i * 31 + 12) - 0.5) * 200,
      dy: seededRandom(i * 31 + 13) * 160 + 50,
      rotation: seededRandom(i * 31 + 14) * 360,
      delay: seededRandom(i * 31 + 15) * 0.45 + 0.1,
      size: seededRandom(i * 31 + 16) * 10 + 8,
    })), []
  );

  // ── Per-character style calculator ──
  const getCharStyle = useCallback((c: CharAnimData, p: number): React.CSSProperties => {
    if (p <= 0) return { display: "inline-block" };
    const adjusted = Math.max(0, Math.min(1, (p - c.delay) / (1 - c.delay)));
    const eased = adjusted * adjusted; // quadratic ease-in: slow start, fast end

    if (eased <= 0) return { display: "inline-block" };

    return {
      display: "inline-block",
      transform: `translate3d(${c.dx * eased}px, ${c.dy * eased}px, 0) rotate(${c.rotation * eased}deg) scale(${1 - eased * 0.6})`,
      opacity: Math.max(0, 1 - eased * 1.4),
      willChange: "transform, opacity",
    };
  }, []);

  // ── Gradient color for line2 characters (simulate bg-clip-text gradient) ──
  const getGradientColor = useCallback((index: number, total: number): string => {
    const t = total > 1 ? index / (total - 1) : 0;
    const opacity = 1 - t * 0.4; // 1.0 → 0.6 across the word
    return `rgba(37, 99, 235, ${opacity})`;
  }, []);

  // Particle color map
  const particleColors = [
    "rgba(37, 99, 235, 0.55)",   // brand blue
    "rgba(29, 29, 31, 0.35)",    // dark
    "rgba(134, 134, 139, 0.4)",  // gray
  ];

  return (
    <section ref={sectionRef} className="relative z-10 px-6 pt-24 pb-32 max-w-6xl mx-auto text-center">
      {/* ── Badge ── */}
      <div
        className="inline-flex items-center gap-2 bg-white/95 md:bg-white/50 md:backdrop-blur-md border border-white rounded-full px-5 py-2 mb-10 shadow-sm"
        style={reducedMotion ? {} : {
          opacity: Math.max(0, 1 - progress * 2.5),
          transform: `translate3d(0, ${progress * -40}px, 0)`,
        }}
      >
        <Star className="w-4 h-4 text-brand fill-brand" />
        <span className="text-xs font-black uppercase tracking-[0.2em] text-[#86868B]">
          El Estándar Premium de Puebla
        </span>
      </div>

      {/* ── Screen reader text ── */}
      <span className="sr-only">{line1} {line2}</span>

      {/* ── Animated heading ── */}
      <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight mb-8 leading-[0.85] text-black relative" aria-hidden="true">
        {/* Line 1: "Domina tu agenda." */}
        {/* Mobile Static View (Immediate render, no layout shifts or JS lag) */}
        <span className="block md:hidden">
          {line1}
        </span>
        {/* Desktop Animated View */}
        <span className="hidden md:block">
          {reducedMotion ? line1 : chars1.map((c, i) => (
            <span key={i} style={getCharStyle(c, progress)}>
              {c.char === " " ? "\u00A0" : c.char}
            </span>
          ))}
        </span>

        {/* Line 2: "Sin esfuerzo." — with gradient colors */}
        {/* Mobile Static View */}
        <span className="block md:hidden bg-gradient-to-r from-brand to-brand/60 bg-clip-text text-transparent">
          {line2}
        </span>
        {/* Desktop Animated View */}
        <span className={`hidden md:block ${reducedMotion ? "bg-gradient-to-r from-brand to-brand/60 bg-clip-text text-transparent" : ""}`}>
          {reducedMotion ? line2 : chars2.map((c, i) => (
            <span
              key={i}
              style={{
                ...getCharStyle(c, progress),
                color: getGradientColor(i, chars2.length),
              }}
            >
              {c.char === " " ? "\u00A0" : c.char}
            </span>
          ))}
        </span>

        {/* ── Hair clipping particles ── */}
        {!reducedMotion && progress > 0.04 && (
          <div className="absolute inset-0 pointer-events-none overflow-visible" aria-hidden="true">
            {particles.map((p, i) => {
              const adjusted = Math.max(0, Math.min(1, (progress - p.delay) / (1 - p.delay)));
              const eased = adjusted * adjusted;
              if (eased <= 0) return null;
              // Fade in → visible → fade out
              const alpha = eased < 0.15 ? eased / 0.15 : eased > 0.7 ? (1 - eased) / 0.3 : 1;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: `${p.width}px`,
                    height: `${p.height}px`,
                    borderRadius: "1px",
                    background: particleColors[p.colorType],
                    transform: `translate3d(${p.dx * eased}px, ${p.dy * eased}px, 0) rotate(${p.rotation + eased * 300}deg)`,
                    opacity: alpha * 0.85,
                    willChange: "transform, opacity",
                  }}
                />
              );
            })}

            {/* ── Scissor sparkles ✂ ── */}
            {sparkles.map((s, i) => {
              const adjusted = Math.max(0, Math.min(1, (progress - s.delay) / (1 - s.delay)));
              const eased = adjusted * adjusted;
              if (eased <= 0.02) return null;
              const alpha = eased < 0.2 ? eased / 0.2 : eased > 0.6 ? (1 - eased) / 0.4 : 1;
              return (
                <div
                  key={`sparkle-${i}`}
                  style={{
                    position: "absolute",
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    transform: `translate3d(${s.dx * eased}px, ${s.dy * eased}px, 0) rotate(${s.rotation + eased * 200}deg) scale(${0.5 + eased * 0.5})`,
                    opacity: alpha * 0.45,
                    willChange: "transform, opacity",
                  }}
                >
                  <Scissors
                    style={{ width: `${s.size}px`, height: `${s.size}px` }}
                    className="text-brand/60"
                  />
                </div>
              );
            })}
          </div>
        )}
      </h1>

      {/* ── Subtitle ── */}
      <p
        className="text-xl sm:text-2xl text-[#86868B] max-w-2xl mx-auto mb-12 leading-relaxed font-medium"
        style={reducedMotion ? {} : {
          opacity: Math.max(0, 1 - progress * 2),
          transform: `translate3d(0, ${progress * 50}px, 0)`,
        }}
      >
        Olvídate del caos. Sistema 360° con reservas online, POS y lealtad diseñado para las mejores barberías.
      </p>

      {/* ── CTA ── */}
      <div
        className="flex flex-col sm:flex-row gap-5 justify-center"
        style={reducedMotion ? {} : {
          opacity: Math.max(0, 1 - progress * 2.2),
          transform: `translate3d(0, ${progress * 60}px, 0) scale(${1 - progress * 0.08})`,
        }}
      >
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-black hover:bg-zinc-800 text-white font-black px-10 py-5 rounded-[2rem] text-xl transition-colors shadow-2xl shadow-black/20 flex items-center justify-center gap-3"
        >
          Iniciar ahora
          <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
        </a>
      </div>
    </section>
  );
}
