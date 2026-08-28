import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Orchestra, StagePos, Lang } from "../lib/core";
import { INSTRUMENT_MAP, instrumentName } from "../lib/instruments";
import { mulberry32 } from "../lib/core";
import { engine } from "../lib/engine";
import { useSonic } from "../lib/store";
import { Icon } from "./icons";
import { InstrumentGlyph } from "./InstrumentGlyph";

/* ============================================================
   ESCENARIO SVG interactivo con glifos de instrumentos reales.
   Anillo pulsante con el nivel del canal en tiempo real,
   arrastre para reubicar, clic para silenciar.
   ============================================================ */

const W = 100, H = 62;

export function StageView({ orch, lang, live = false, onMove, onToggleMute, className = "" }: {
  orch: Orchestra;
  lang: Lang;
  live?: boolean;
  onMove?: (id: string, pos: StagePos) => void;
  onToggleMute?: (id: string) => void;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    if (!live) { setLevels({}); return; }
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 33) return;
      last = t;
      const next: Record<string, number> = {};
      for (const id of orch.instrumentIds) next[id] = engine.getLevel(id);
      setLevels(next);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [live, orch.instrumentIds]);

  const toSvg = (clientX: number, clientY: number): StagePos => {
    const el = svgRef.current;
    if (!el) return { x: 0.5, y: 0.5 };
    const r = el.getBoundingClientRect();
    return {
      x: Math.min(0.97, Math.max(0.03, (clientX - r.left) / r.width)),
      y: Math.min(0.95, Math.max(0.1, (clientY - r.top) / r.height)),
    };
  };

  const rows = [0.30, 0.48, 0.68, 0.88];

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className={`w-full ${className}`} style={{ touchAction: "none" }}>
      <defs>
        <linearGradient id="stageFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#241f33" />
          <stop offset="55%" stopColor="#191622" />
          <stop offset="100%" stopColor="#120f1a" />
        </linearGradient>
        <radialGradient id="stageGlow" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="rgba(255,176,58,0.16)" />
          <stop offset="60%" stopColor="rgba(255,176,58,0.03)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width={W} height={H} rx="3" fill="url(#stageFloor)" />
      <rect x="0" y="0" width={W} height={H} rx="3" fill="url(#stageGlow)" />
      {rows.map((y, i) => (
        <path key={y} d={`M 6 ${y * H} Q ${W / 2} ${(y - 0.075) * H} ${W - 6} ${y * H}`}
          fill="none" stroke="#2e2940" strokeWidth="0.35" opacity={0.9 - i * 0.15} />
      ))}
      <path d={`M 2 6 Q ${W / 2} -2 ${W - 2} 6`} fill="none" stroke="#ffb03a" strokeWidth="0.4" opacity="0.5" />

      {Array.from({ length: 11 }).map((_, i) => {
        const x = 8 + (i * (W - 16)) / 10;
        return (
          <circle key={i} cx={x} cy={H - 1.6} r="0.55" fill={live ? "#ffb03a" : "#3d3752"}
            style={live ? { filter: "drop-shadow(0 0 1.4px rgba(255,176,58,0.9))" } : undefined}>
            {live && <animate attributeName="opacity" values="0.55;1;0.55" dur={`${1.2 + (i % 3) * 0.4}s`} repeatCount="indefinite" />}
          </circle>
        );
      })}

      {orch.instrumentIds.map((id) => {
        const pos = orch.stage[id] ?? { x: 0.5, y: 0.5 };
        const def = INSTRUMENT_MAP[id];
        if (!def) return null;
        const x = pos.x * W, y = pos.y * H;
        const lvl = levels[id] ?? 0;
        const ch = orch.channels[id];
        const muted = ch?.mute;
        const color = def.color;
        const scale = 1 + lvl * 0.5;
        return (
          <g
            key={id}
            transform={`translate(${x} ${y})`}
            className={onMove ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
            onPointerDown={(e) => {
              if (!onMove) return;
              dragRef.current = { id, moved: false };
              (e.target as Element).setPointerCapture(e.pointerId);
              e.stopPropagation();
            }}
            onPointerMove={(e) => {
              const d = dragRef.current;
              if (!d || d.id !== id) return;
              d.moved = true;
              onMove?.(id, toSvg(e.clientX, e.clientY));
            }}
            onPointerUp={() => {
              const d = dragRef.current;
              if (d && d.id === id && !d.moved) onToggleMute?.(id);
              dragRef.current = null;
            }}
            onPointerEnter={() => setHover(id)}
            onPointerLeave={() => setHover(null)}
          >
            {live && lvl > 0.05 && (
              <circle r={3.4 * scale} fill="none" stroke={color} strokeWidth="0.3" opacity={lvl * 0.85}
                style={{ filter: `drop-shadow(0 0 2px ${color})` }} />
            )}
            <circle r="2.7" fill="#0e0c11" stroke={muted ? "#4a4362" : color} strokeWidth="0.4"
              opacity={muted ? 0.45 : 1} />
            <g transform="translate(-1.7 -1.7) scale(0.14)" opacity={muted ? 0.4 : 1} style={{ pointerEvents: "none" }}>
              <GlyphRaw id={id} family={def.family} color={muted ? "#4a4362" : color} />
            </g>
            <text y="5.2" textAnchor="middle" fontSize="2" fill={hover === id ? "#efeaf5" : "#9a93b5"}
              fontFamily="JetBrains Mono, monospace" style={{ pointerEvents: "none" }}>
              {instrumentName(id, lang).split(" ")[0].slice(0, 9)}
            </text>
            {hover === id && (
              <g style={{ pointerEvents: "none" }}>
                <rect x="-13" y="-9.4" width="26" height="4.4" rx="1" fill="#0b0a0f" stroke={color} strokeWidth="0.25" opacity="0.96" />
                <text y="-6.4" textAnchor="middle" fontSize="2.3" fill="#efeaf5" fontFamily="Instrument Sans, sans-serif">
                  {instrumentName(id, lang)} · {Math.round((ch?.volume ?? 0.75) * 100)}%
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* glifo crudo reutilizado dentro del SVG del escenario */
function GlyphRaw({ id, family, color }: { id: string; family: string; color: string }) {
  return (
    <g style={{ color }}>
      <InstrumentGlyph id={id} family={family} color={color} size={24} />
    </g>
  );
}

/* ============================================================
   PORTADA GENERATIVA (canvas determinista por semilla)
   ============================================================ */

export function CoverArt({ seed, palette, moodKey, size = 220, className = "" }: {
  seed: number;
  palette: [string, string, string];
  moodKey: string;
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const rng = mulberry32(seed);
    const [c1, c2, c3] = palette;

    const bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, "#171322");
    bg.addColorStop(1, "#0b0a0f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    const cx = size * (0.32 + rng() * 0.36);
    const cy = size * (0.3 + rng() * 0.4);

    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.75);
    halo.addColorStop(0, `${c1}55`);
    halo.addColorStop(0.55, `${c2}22`);
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    const rings = 6 + Math.floor(rng() * 5);
    for (let i = 0; i < rings; i++) {
      const r = (size * 0.08) + (i / rings) * size * (0.42 + rng() * 0.2);
      const a0 = rng() * Math.PI * 2;
      const span = Math.PI * (0.5 + rng() * 1.3);
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a0 + span);
      ctx.strokeStyle = i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : c3;
      ctx.globalAlpha = 0.5 - (i / rings) * 0.3;
      ctx.lineWidth = 1 + rng() * 2.4;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rng() * Math.PI);
    const s = size * (0.1 + rng() * 0.06);
    const grad = ctx.createLinearGradient(-s, -s, s, s);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.shadowColor = c1;
    ctx.shadowBlur = 18;
    if (["heroic", "bright"].includes(moodKey)) {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * s, Math.sin(a) * s);
      }
      ctx.closePath();
      ctx.fill();
    } else if (["dark", "nocturne", "melancholy"].includes(moodKey)) {
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(s * 0.5, -s * 0.35, s * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    } else {
      ctx.fillRect(-s * 0.8, -s * 0.8, s * 1.6, s * 1.6);
    }
    ctx.restore();

    ctx.beginPath();
    const wy = size * (0.62 + rng() * 0.2);
    for (let x = 0; x <= size; x += 2) {
      const y = wy + Math.sin(x * 0.05 + seed) * size * 0.045 * Math.sin(x * 0.011 + rng() * 3);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = c3;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.globalAlpha = 1;

    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rng() * 0.05})`;
      ctx.fillRect(rng() * size, rng() * size, 1, 1);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.09)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }, [seed, palette, moodKey, size]);

  return <canvas ref={ref} className={className} style={{ width: size, height: size }} />;
}

/* ============================================================
   Helpers de UI: cabecera, estado vacío, chip, modal, toasts
   ============================================================ */

export function SectionHeader({ kicker, title, subtitle, right }: {
  kicker: string; title: string; subtitle?: string; right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <p className="silk-label mb-1.5 text-tube-500/90">{kicker}</p>
        <h1 className="font-display font-extrabold text-[26px] md:text-[30px] leading-tight text-ink-100">{title}</h1>
        {subtitle && <p className="text-ink-300 text-[13.5px] mt-1.5 max-w-xl leading-relaxed">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function EmptyState({ icon, title, hint, action }: {
  icon: string; title: string; hint: string; action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="panel p-10 md:p-14 flex flex-col items-center text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-ink-800 border border-ink-600 flex items-center justify-center text-tube-500 mb-5 shadow-[0_0_40px_-10px_rgba(255,176,58,0.4)]">
        <Icon name={icon} size={30} strokeWidth={1.5} />
      </div>
      <h2 className="font-display font-bold text-xl">{title}</h2>
      <p className="text-ink-400 text-sm mt-2 max-w-sm leading-relaxed">{hint}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

export function Chip({ children, color = "#ffb03a" }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-sm"
      style={{
        color, borderColor: `${color}55`, background: `${color}14`,
        fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.02em",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

export function ConfirmModal({ open, title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: {
  open: boolean; title: string; body: string;
  confirmLabel: string; cancelLabel: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" onClick={onCancel} />
          <motion.div initial={{ scale: 0.94, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }} className="panel relative w-full max-w-sm p-6">
            <h3 className="font-display font-bold text-lg">{title}</h3>
            <p className="text-ink-300 text-sm mt-2 leading-relaxed">{body}</p>
            <div className="flex justify-end gap-2 mt-6">
              <button className="btn-ghost rounded-lg px-4 py-2 text-sm font-semibold" onClick={onCancel}>{cancelLabel}</button>
              <button className="rounded-lg px-5 py-2 text-sm font-bold bg-clip-500 text-[#2a0505] border border-clip-400 shadow-[0_0_16px_rgba(255,92,92,0.35)] active:scale-95 transition-transform" onClick={onConfirm}>{confirmLabel}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ToastHost() {
  const toasts = useSonic((s) => s.toasts);
  const dismiss = useSonic((s) => s.dismissToast);
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 items-end">
      <AnimatePresence>
        {toasts.map((tst) => (
          <motion.button
            key={tst.id}
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
            onClick={() => dismiss(tst.id)}
            className="panel px-4 py-2.5 flex items-center gap-2.5 text-[13px] font-semibold text-ink-100 border-tube-500/40"
          >
            <span className="text-led-400"><Icon name="check" size={15} /></span>
            {tst.msg}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
