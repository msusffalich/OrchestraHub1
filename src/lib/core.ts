/* ============================================================
   Tipos compartidos + azar determinista (seeded)
   ============================================================ */

export type Lang = "es" | "en";

export type Family = "strings" | "brass" | "winds" | "keys" | "plucked" | "percussion" | "drums" | "synth" | "voice";
export type Role = "melody" | "harmony" | "bass" | "drums" | "perc" | "pads" | "voice" | "comp";

export type Arch =
  | "strings" | "brass" | "woodwind" | "flute" | "piano" | "epiano"
  | "organ" | "nylon" | "electric" | "bass" | "subbass" | "pad"
  | "lead" | "voice" | "harp" | "celesta"
  | "accordion" | "bandoneon" | "sitar" | "bagpipe" | "harmonium" | "scraper"
  | "panpipes" | "andeanflute" | "charango";

export type DrumKind =
  | "kick" | "snare" | "hat" | "openhat" | "ride" | "tom" | "timpani"
  | "conga" | "clave" | "shaker" | "tambourine" | "crash" | "cowbell" | "clap"
  | "cajon" | "castanets" | "tambora" | "djembe" | "tabla" | "bodhran" | "timbales"
  | "leguero" | "quijada" | "cajita" | "cajavallenata" | "bomba" | "furruco";

export interface InstrumentDef {
  id: string;
  nameES: string;
  nameEN: string;
  family: Family;
  roles: Role[];
  color: string;
  arch?: Arch;
  drum?: DrumKind;
  range: [number, number];
  vol: number;
  aliases: string[];
}

export interface StagePos { x: number; y: number; }

export interface ChannelState {
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
}

export interface Orchestra {
  id: string;
  name: string;
  genreId: string;
  fusions: string[];                 // hasta 2 estilos adicionales
  instrumentIds: string[];
  stage: Record<string, StagePos>;
  channels: Record<string, ChannelState>;
  createdAt: number;
}

export interface CompEvent {
  beat: number;
  ch: string;
  midi: number;
  dur: number;
  vel: number;
}

export interface Composition {
  seed: number;
  events: CompEvent[];
  bpm: number;
  meter: number;
  bars: number;
  totalBeats: number;
  durationSec: number;
  moodKey: string;
  title: string;
  rain: boolean;
  swing: number;
  genreId: string;
  fusionIds: string[];
  space: number;    // 0 íntimo · 1 sala grande
  bright: number;   // 0 cálido · 1 brillante
}

export interface PromptAnalysis {
  bpm: number;
  meter: 2 | 3 | 4;
  moodKey: string;
  minor: boolean;
  energy: number;
  swing: number;
  rain: boolean;
  leaderId?: string;
  sections: number;
}

export interface Track {
  id: string;
  title: string;
  prompt: string;
  orchestraId: string;
  orchestraName: string;
  genreId: string;
  fusions?: string[];
  seed: number;
  bpm: number;
  meter: number;
  bars: number;
  createdAt: number;
  coverSeed: number;
  mix: Record<string, ChannelState>;
  space?: number;
  bright?: number;
}

/* parámetros ajustables del estilo antes de generar */
export interface GenParams {
  bpm: number;
  energy: number;  // 0..1
  swing: number;   // 0..0.5
  space: number;   // 0..1
  bright: number;  // 0..1
}

/* ---------------- azar determinista ---------------- */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type RNG = () => number;
export const pick = <T,>(rng: RNG, arr: T[]): T => arr[Math.floor(rng() * arr.length)];
export const range = (rng: RNG, min: number, max: number) => min + rng() * (max - min);
export const irange = (rng: RNG, min: number, max: number) => Math.floor(min + rng() * (max - min + 1));
export const chance = (rng: RNG, p: number) => rng() < p;
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}
