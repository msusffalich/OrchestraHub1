import React, { useCallback, useRef } from "react";
import { clamp } from "../lib/core";

/* ============================================================
   Controles de consola: Fader, Knob, vúmetro LED, M/S, slider.
   ============================================================ */

export function Knob({ value, min, max, onChange, bipolar = false, size = 44, label, format }: {
  value: number; min: number; max: number;
  onChange: (v: number) => void;
  bipolar?: boolean; size?: number; label?: string;
  format?: (v: number) => string;
}) {
  const drag = useRef<{ y: number; v: number } | null>(null);
  const t = (value - min) / (max - min);
  const angle = -135 + t * 270;
  const r = size / 2 - 5;
  const cx = size / 2, cy = size / 2;

  const arcPath = (a0: number, a1: number) => {
    const p = (a: number) => [cx + r * Math.cos(((a - 90) * Math.PI) / 180), cy + r * Math.sin(((a - 90) * Math.PI) / 180)];
    const [x0, y0] = p(a0); const [x1, y1] = p(a1);
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };

  const setFromPointer = useCallback((clientY: number, start: boolean) => {
    if (start) drag.current = { y: clientY, v: value };
    if (!drag.current) return;
    const dy = drag.current.y - clientY;
    const span = max - min;
    const nv = clamp(drag.current.v + (dy / 140) * span, min, max);
    onChange(Math.round(nv * 100) / 100);
  }, [min, max, onChange, value]);

  const zeroAngle = bipolar ? 0 : -135;

  return (
    <div className="flex flex-col items-center gap-0.5 select-none" style={{ width: size + 10 }}>
      <svg
        width={size} height={size}
        className="cursor-ns-resize touch-none focus-ring"
        tabIndex={0} role="slider"
        aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} aria-label={label}
        onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); setFromPointer(e.clientY, true); }}
        onPointerMove={(e) => { if (drag.current) setFromPointer(e.clientY, false); }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onDoubleClick={() => onChange(bipolar ? (min + max) / 2 : min + (max - min) * 0.75)}
        onWheel={(e) => {
          const step = (max - min) / 40;
          onChange(clamp(value - Math.sign(e.deltaY) * step, min, max));
        }}
        onKeyDown={(e) => {
          const step = (max - min) / 20;
          if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(clamp(value + step, min, max));
          if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(clamp(value - step, min, max));
        }}
      >
        <circle cx={cx} cy={cy} r={r + 3.5} fill="rgba(0,0,0,0.42)" stroke="#2e2940" strokeWidth="1" />
        <path d={arcPath(-135, 135)} stroke="#2e2940" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path
          d={arcPath(Math.min(zeroAngle, angle), Math.max(zeroAngle, angle))}
          stroke={bipolar ? "#45e0cd" : "#ffb03a"} strokeWidth="3.4" fill="none" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${bipolar ? "rgba(69,224,205,0.7)" : "rgba(255,176,58,0.7)"})` }}
        />
        <circle cx={cx} cy={cy} r={r - 5.5} fill="url(#knobFace)" stroke="#4a4362" strokeWidth="1" />
        <line
          x1={cx} y1={cy}
          x2={cx + (r - 8) * Math.cos(((angle - 90) * Math.PI) / 180)}
          y2={cy + (r - 8) * Math.sin(((angle - 90) * Math.PI) / 180)}
          stroke="#efeaf5" strokeWidth="2.2" strokeLinecap="round"
        />
        <defs>
          <radialGradient id="knobFace" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#4a4362" />
            <stop offset="70%" stopColor="#221e2e" />
            <stop offset="100%" stopColor="#171322" />
          </radialGradient>
        </defs>
      </svg>
      {label && <span className="silk-label-xs">{label}</span>}
      {format && <span className="font-mono text-[9px] text-ink-300 tabular leading-none">{format(value)}</span>}
    </div>
  );
}

export function Fader({ value, onChange, height = 168, meter = 0, color = "#ffb03a", disabled = false }: {
  value: number;
  onChange: (v: number) => void;
  height?: number;
  meter?: number;
  color?: string;
  disabled?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromY = useCallback((clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const v = 1 - clamp((clientY - rect.top) / rect.height, 0, 1);
    onChange(Math.round(v * 200) / 200);
  }, [onChange]);

  const segments = 14;
  const lit = Math.round(meter * segments);

  return (
    <div className="flex items-stretch gap-1.5" style={{ height }}>
      <div
        ref={trackRef}
        className={`fader-track flex-1 ${disabled ? "opacity-40 pointer-events-none" : ""}`}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as Element).setPointerCapture(e.pointerId);
          setFromY(e.clientY);
        }}
        onPointerMove={(e) => { if (dragging.current) setFromY(e.clientY); }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
      >
        <div
          className="absolute bottom-0 left-[2px] right-[2px] rounded-b-[5px] pointer-events-none"
          style={{
            height: `${value * 100}%`,
            background: `linear-gradient(180deg, ${color}cc, ${color}33)`,
            opacity: 0.5,
            boxShadow: `0 0 10px ${color}44`,
          }}
        />
        {[0.25, 0.5, 0.75].map((m) => (
          <div key={m} className="absolute left-[-5px] w-[4px] h-px bg-ink-500 pointer-events-none" style={{ bottom: `${m * 100}%` }} />
        ))}
        <div className="fader-cap" style={{ bottom: `${value * 100}%` }} />
      </div>
      <div className="w-[7px] rounded-[4px] bg-black/60 border border-black/70 p-[1.5px] flex flex-col-reverse gap-[1.5px] overflow-hidden">
        {Array.from({ length: segments }).map((_, i) => {
          const on = i < lit;
          const c = i >= segments - 2 ? "#ff5c5c" : i >= segments - 5 ? "#ffc53d" : "#45e0cd";
          return (
            <div key={i} className="flex-1 rounded-[1px] transition-colors duration-75"
              style={{ background: on ? c : "#1b1725", boxShadow: on ? `0 0 4px ${c}88` : "none" }} />
          );
        })}
      </div>
    </div>
  );
}

export function MSButton({ active, kind, onClick, title }: {
  active: boolean; kind: "mute" | "solo"; onClick: () => void; title: string;
}) {
  const colors = kind === "mute"
    ? "bg-clip-500/90 text-[#2a0505] border-clip-500 shadow-[0_0_12px_rgba(255,92,92,0.5)]"
    : "bg-solo-400/95 text-[#332400] border-solo-400 shadow-[0_0_12px_rgba(255,197,61,0.5)]";
  return (
    <button
      onClick={onClick} title={title}
      className={`w-7 h-6 rounded-[5px] border font-mono text-[10px] font-bold transition-all duration-100 active:scale-90 ${
        active ? colors : "bg-ink-800 text-ink-400 border-ink-600 hover:border-ink-500 hover:text-ink-200"
      }`}
    >
      {kind === "mute" ? "M" : "S"}
    </button>
  );
}

export function Led({ on, color = "amber", pulse = false, className = "" }: {
  on: boolean; color?: "amber" | "teal" | "red"; pulse?: boolean; className?: string;
}) {
  return <span className={`led ${on ? (color === "teal" ? "led-on" : color === "red" ? "led-red" : "led-amber") : ""} ${on && pulse ? "led-pulse" : ""} ${className}`} />;
}

export function TransportButton({ icon, onClick, active = false, accent = false, size = 40, title, disabled = false }: {
  icon: React.ReactNode; onClick: () => void; active?: boolean; accent?: boolean;
  size?: number; title: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick} title={title} disabled={disabled}
      className={`rounded-full border flex items-center justify-center transition-all duration-150 active:scale-90 disabled:opacity-35 disabled:pointer-events-none ${
        accent ? "btn-primary"
          : active ? "bg-ink-600 border-ink-500 text-tube-400 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]"
            : "btn-ghost"
      }`}
      style={{ width: size, height: size }}
    >
      {icon}
    </button>
  );
}

/* ---------- slider horizontal para parámetros ---------- */
export function HSlider({ value, min, max, step = 1, onChange, accent = "#ffb03a" }: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; accent?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range" className="param-slider"
      min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ "--fill": `${pct}%`, ["--accent" as string]: accent } as React.CSSProperties}
    />
  );
}
