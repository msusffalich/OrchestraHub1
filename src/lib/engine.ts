import type { ChannelState, CompEvent, Composition } from "./core";
import { INSTRUMENT_MAP } from "./instruments";

/* ============================================================
   MOTOR WEB AUDIO — cadena por canal:
   Gain → BiquadFilter → StereoPanner → fader
   y máster: DynamicsCompressor + AnalyserNode.
   Scheduler con lookahead (sin clics) y ancla de BPM en vivo.
   ============================================================ */

export interface EngineSnapshot {
  status: "stopped" | "playing" | "paused";
  positionBeats: number;
  totalBeats: number;
  bpm: number;
  sourceId: string;
  sourceKind: "session" | "track";
}

interface VoiceArch {
  a: number; d: number; s: number; r: number;
  lpMul: number; lpMax: number;
  vib?: number;
  layers: [OscillatorType, number, number][];
}

const ARCHS: Record<string, VoiceArch> = {
  strings:  { a: 0.09, d: 0.12, s: 0.8, r: 0.22, lpMul: 5.5, lpMax: 3800, vib: 4, layers: [["sawtooth", 1, 0.42], ["sawtooth", 1.004, 0.32], ["sawtooth", 0.997, 0.28]] },
  brass:    { a: 0.055, d: 0.15, s: 0.72, r: 0.18, lpMul: 3.5, lpMax: 2600, vib: 3, layers: [["sawtooth", 1, 0.5], ["square", 0.5, 0.12], ["sawtooth", 1.005, 0.2]] },
  woodwind: { a: 0.05, d: 0.1, s: 0.75, r: 0.15, lpMul: 4, lpMax: 3000, vib: 5, layers: [["sawtooth", 1, 0.42], ["sine", 2, 0.18]] },
  flute:    { a: 0.07, d: 0.1, s: 0.8, r: 0.2, lpMul: 6, lpMax: 4200, vib: 6, layers: [["sine", 1, 0.55], ["triangle", 2.001, 0.2], ["sine", 3, 0.08]] },
  piano:    { a: 0.003, d: 0.9, s: 0.12, r: 0.35, lpMul: 8, lpMax: 6500, layers: [["triangle", 1, 0.5], ["sine", 2.76, 0.2], ["sine", 5.4, 0.07]] },
  epiano:   { a: 0.004, d: 0.7, s: 0.15, r: 0.3, lpMul: 6, lpMax: 4200, layers: [["sine", 1, 0.5], ["sine", 3.5, 0.16], ["triangle", 14.8, 0.04]] },
  organ:    { a: 0.03, d: 0.05, s: 0.85, r: 0.12, lpMul: 5, lpMax: 3600, layers: [["sine", 1, 0.4], ["sine", 2, 0.3], ["sine", 3, 0.22], ["sine", 4, 0.12]] },
  nylon:    { a: 0.004, d: 0.55, s: 0.08, r: 0.28, lpMul: 5, lpMax: 3200, layers: [["triangle", 1, 0.55], ["sine", 2, 0.22], ["sine", 3.01, 0.1]] },
  electric: { a: 0.006, d: 0.4, s: 0.3, r: 0.22, lpMul: 3.5, lpMax: 2800, vib: 5, layers: [["sawtooth", 1, 0.42], ["sawtooth", 1.01, 0.25], ["square", 0.5, 0.12]] },
  bass:     { a: 0.012, d: 0.35, s: 0.5, r: 0.2, lpMul: 2.2, lpMax: 1400, layers: [["sawtooth", 1, 0.5], ["sine", 1, 0.35], ["sine", 0.5, 0.25]] },
  subbass:  { a: 0.01, d: 0.3, s: 0.6, r: 0.18, lpMul: 1.6, lpMax: 900, layers: [["sine", 1, 0.7], ["sawtooth", 1, 0.2]] },
  pad:      { a: 0.45, d: 0.3, s: 0.85, r: 0.7, lpMul: 3, lpMax: 2200, vib: 3, layers: [["sawtooth", 1, 0.3], ["sawtooth", 0.996, 0.28], ["sawtooth", 1.006, 0.26]] },
  lead:     { a: 0.02, d: 0.2, s: 0.65, r: 0.25, lpMul: 5, lpMax: 4000, vib: 5, layers: [["sawtooth", 1, 0.4], ["sawtooth", 1.008, 0.3], ["sine", 2, 0.15]] },
  voice:    { a: 0.11, d: 0.15, s: 0.8, r: 0.28, lpMul: 3.2, lpMax: 2400, vib: 6, layers: [["sawtooth", 1, 0.36], ["sawtooth", 1.005, 0.22], ["sine", 0.5, 0.18]] },
  harp:     { a: 0.004, d: 0.7, s: 0.06, r: 0.4, lpMul: 7, lpMax: 5000, layers: [["triangle", 1, 0.5], ["sine", 2, 0.25], ["sine", 4.1, 0.08]] },
  celesta:  { a: 0.003, d: 0.4, s: 0.05, r: 0.25, lpMul: 12, lpMax: 7000, layers: [["sine", 1, 0.5], ["sine", 3.01, 0.2], ["sine", 9.2, 0.05]] },
  accordion:{ a: 0.04, d: 0.12, s: 0.82, r: 0.14, lpMul: 4.6, lpMax: 2900, vib: 5, layers: [["sawtooth", 1, 0.38], ["sawtooth", 1.006, 0.3], ["sine", 0.5, 0.22]] },
  bandoneon:{ a: 0.075, d: 0.15, s: 0.8, r: 0.2, lpMul: 3.6, lpMax: 2100, vib: 5, layers: [["sawtooth", 1, 0.42], ["sawtooth", 1.005, 0.34], ["sine", 0.5, 0.2]] },
  sitar:    { a: 0.005, d: 0.55, s: 0.1, r: 0.5, lpMul: 5, lpMax: 3000, vib: 7, layers: [["sawtooth", 1, 0.4], ["sawtooth", 1.013, 0.16], ["triangle", 2.01, 0.13]] },
  bagpipe:  { a: 0.11, d: 0.12, s: 0.85, r: 0.22, lpMul: 4, lpMax: 2600, vib: 9, layers: [["sawtooth", 1, 0.38], ["sawtooth", 1.009, 0.34], ["sawtooth", 0.5, 0.22]] },
  harmonium:{ a: 0.09, d: 0.11, s: 0.85, r: 0.16, lpMul: 3.2, lpMax: 1800, vib: 3, layers: [["sawtooth", 1, 0.34], ["sine", 2, 0.2], ["sine", 3, 0.1]] },
  panpipes: { a: 0.065, d: 0.1, s: 0.75, r: 0.17, lpMul: 7, lpMax: 5200, vib: 5, layers: [["sine", 1, 0.5], ["sine", 0.9955, 0.36], ["triangle", 2, 0.12]] },
  andeanflute:{ a: 0.1, d: 0.1, s: 0.72, r: 0.2, lpMul: 6, lpMax: 3800, vib: 7, layers: [["sine", 1, 0.5], ["triangle", 1.002, 0.26], ["sine", 2.001, 0.15]] },
  charango: { a: 0.003, d: 0.28, s: 0.08, r: 0.18, lpMul: 9, lpMax: 5600, layers: [["triangle", 1, 0.55], ["sine", 2.004, 0.2], ["sine", 3.01, 0.1]] },
};

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/* ---------- respuesta al impulso generada (reverb por convolución) ---------- */
function makeImpulse(ctx: BaseAudioContext, seconds = 2.2, decay = 2.8): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t01 = i / len;
      /* cola exponencial + unas pocas reflexiones tempranas */
      let v = (Math.random() * 2 - 1) * Math.pow(1 - t01, decay);
      if (i < sr * 0.05 && Math.random() < 0.001) v += (Math.random() * 2 - 1) * 0.7;
      d[i] = v * (ch === 0 ? 1 : 0.96);
    }
  }
  return buf;
}

/* curva de saturación suave (calidez de válvula) */
function makeSatCurve(k = 2.4): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(n);
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / norm;
  }
  return curve;
}

let noiseBuf: AudioBuffer | null = null;
function getNoise(ctx: BaseAudioContext): AudioBuffer {
  if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function toneHit(ctx: BaseAudioContext, dest: AudioNode, t: number, v: number,
  f0: number, f1: number, dur: number, type: OscillatorType = "sine") {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noiseHit(ctx: BaseAudioContext, dest: AudioNode, t: number, v: number,
  dur: number, filterType: BiquadFilterType = "highpass", freq = 5000, q = 1) {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t);
  src.stop(t + dur + 0.05);
}

/* ---------- voz melódica ---------- */
function playMelodic(ctx: BaseAudioContext, dest: AudioNode, archKey: string,
  midi: number, t: number, dur: number, vel: number, dark: number) {
  const arch = ARCHS[archKey] ?? ARCHS.piano;
  const freq = midiToFreq(midi);

  /* raspadores (güiro/güira): barrido de ruido, sin osciladores */
  if (archKey === "scraper") {
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);
    src.playbackRate.setValueAtTime(0.7 + Math.random() * 0.5, t);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 3.5;
    f.frequency.setValueAtTime(1300, t);
    f.frequency.linearRampToValueAtTime(3600, t + Math.min(dur, 0.35));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.08, Math.min(dur, 0.4)));
    src.connect(f).connect(g).connect(dest);
    src.start(t);
    src.stop(t + Math.min(dur, 0.4) + 0.05);
    return;
  }

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = Math.min(arch.lpMax, freq * arch.lpMul) * (1.25 - dark * 0.75);
  lp.Q.value = 0.6;

  /* ataque humanizado: ninguna nota arranca exactamente igual */
  const atk = arch.a * (0.7 + Math.random() * 0.7);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(vel, t + atk);
  env.gain.setTargetAtTime(vel * arch.s, t + atk, arch.d / 3);
  const relAt = t + Math.max(atk + 0.03, dur);
  env.gain.setTargetAtTime(0.0001, relAt, arch.r / 3);

  lp.connect(env).connect(dest);

  /* deriva lenta de afinación (±5 cents): mantiene "vivo" el sostenido */
  const drift = ctx.createOscillator();
  drift.frequency.value = 0.22 + Math.random() * 0.3;
  const driftGain = ctx.createGain();
  driftGain.gain.value = 4.5;
  drift.connect(driftGain);
  drift.start(t);
  drift.stop(relAt + arch.r + 0.2);

  for (const [type, mult, gain] of arch.layers) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq * mult;
    osc.detune.value = (Math.random() - 0.5) * 7;
    const og = ctx.createGain();
    og.gain.value = gain;
    if (arch.vib) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 4.2 + Math.random() * 1.4;
      const lg = ctx.createGain();
      lg.gain.value = freq * 0.004 * (arch.vib / 6);
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(relAt + arch.r + 0.2);
    }
    driftGain.connect(osc.detune);
    osc.connect(og).connect(lp);
    osc.start(t);
    osc.stop(relAt + arch.r + 0.2);
  }

  /* aire / respiración: capa de ruido filtrado que sigue la envolvente.
     Es lo que más acerca vientos, cuerdas y voces al timbre real. */
  const BREATH: Record<string, number> = {
    flute: 0.16, panpipes: 0.14, andeanflute: 0.14, woodwind: 0.08, brass: 0.055,
    voice: 0.07, bagpipe: 0.05, strings: 0.022, pad: 0.018, harmonium: 0.03,
  };
  const breath = BREATH[archKey] ?? 0;
  if (breath > 0) {
    const nsrc = ctx.createBufferSource();
    nsrc.buffer = getNoise(ctx);
    const nf = ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = Math.min(9500, freq * 3.6);
    nf.Q.value = 0.7;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(vel * breath, t + atk);
    ng.gain.setTargetAtTime(vel * breath * arch.s, t + atk, arch.d / 3);
    ng.gain.setTargetAtTime(0.0001, relAt, arch.r / 3);
    nsrc.connect(nf).connect(ng).connect(lp);
    nsrc.start(t);
    nsrc.stop(relAt + arch.r + 0.2);
  }
}

/* ---------- percusión ---------- */
const KIT_MAP: Record<number, string> = {
  36: "kick", 38: "snare", 42: "hat", 46: "openhat", 51: "ride",
  49: "crash", 45: "tom", 43: "tom", 48: "tom", 39: "clap", 56: "cowbell",
};

function playDrum(ctx: BaseAudioContext, dest: AudioNode, kind: string, midi: number, t: number, v: number) {
  switch (kind) {
    case "kick":
      toneHit(ctx, dest, t, v, 150, 42, 0.3);
      noiseHit(ctx, dest, t, v * 0.3, 0.03, "lowpass", 400);
      noiseHit(ctx, dest, t, v * 0.45, 0.012, "highpass", 3200); /* click del mazo */
      break;
    case "snare":
      noiseHit(ctx, dest, t, v * 0.8, 0.16, "bandpass", 1800, 1.2);
      toneHit(ctx, dest, t, v * 0.4, 240, 140, 0.09, "triangle");
      noiseHit(ctx, dest, t, v * 0.22, 0.42, "bandpass", 950, 0.8); /* cola de sala */
      break;
    case "clap":
      noiseHit(ctx, dest, t, v * 0.7, 0.12, "bandpass", 1400, 2);
      noiseHit(ctx, dest, t + 0.02, v * 0.5, 0.1, "bandpass", 1500, 2);
      break;
    case "hat":
      noiseHit(ctx, dest, t, v * 0.5, 0.045, "highpass", 7500);
      break;
    case "openhat":
      noiseHit(ctx, dest, t, v * 0.5, 0.3, "highpass", 7000);
      break;
    case "ride":
      noiseHit(ctx, dest, t, v * 0.55, 0.5, "highpass", 5200);
      toneHit(ctx, dest, t, v * 0.12, 820, 780, 0.4, "triangle");
      break;
    case "crash":
      noiseHit(ctx, dest, t, v * 0.6, 1.2, "highpass", 4200);
      break;
    case "tom": {
      const base = 90 + (midi - 41) * 8;
      toneHit(ctx, dest, t, v * 0.9, base * 1.6, base, 0.28);
      break;
    }
    case "timpani": {
      const f = midiToFreq(midi);
      toneHit(ctx, dest, t, v, f * 1.3, f, 0.9);
      noiseHit(ctx, dest, t, v * 0.15, 0.12, "lowpass", 500);
      break;
    }
    case "conga":
      toneHit(ctx, dest, t, v * 0.9, midiToFreq(midi) * 1.4, midiToFreq(midi), 0.18);
      noiseHit(ctx, dest, t, v * 0.2, 0.03, "bandpass", 2500, 2);
      break;
    case "clave":
      toneHit(ctx, dest, t, v * 0.8, 2500, 2200, 0.06, "triangle");
      break;
    case "shaker":
      noiseHit(ctx, dest, t, v * 0.4, 0.08, "bandpass", 6500, 1.5);
      break;
    case "tambourine":
      noiseHit(ctx, dest, t, v * 0.5, 0.12, "bandpass", 5500, 2);
      toneHit(ctx, dest, t, v * 0.15, 1200, 1000, 0.08, "triangle");
      break;
    case "cowbell":
      toneHit(ctx, dest, t, v * 0.7, 540, 500, 0.14, "square");
      toneHit(ctx, dest, t, v * 0.4, 800, 760, 0.1, "square");
      break;
    case "cajon":
      if (midi >= 40) { noiseHit(ctx, dest, t, v * 0.7, 0.08, "bandpass", 1900, 4); toneHit(ctx, dest, t, v * 0.3, 300, 180, 0.06, "triangle"); }
      else { toneHit(ctx, dest, t, v * 0.9, 100, 58, 0.2); noiseHit(ctx, dest, t, v * 0.3, 0.04, "lowpass", 320); }
      break;
    case "castanets":
      noiseHit(ctx, dest, t, v * 0.55, 0.035, "bandpass", 2600, 10);
      noiseHit(ctx, dest, t + 0.03, v * 0.4, 0.03, "bandpass", 3400, 8);
      break;
    case "tambora":
      if (midi >= 38) { noiseHit(ctx, dest, t, v * 0.6, 0.06, "bandpass", 950, 2.5); toneHit(ctx, dest, t, v * 0.3, 480, 300, 0.05, "triangle"); }
      else { toneHit(ctx, dest, t, v * 0.9, 115, 62, 0.24); noiseHit(ctx, dest, t, v * 0.25, 0.03, "lowpass", 500); }
      break;
    case "djembe":
      if (midi < 48) { toneHit(ctx, dest, t, v * 0.95, 82, 48, 0.28); noiseHit(ctx, dest, t, v * 0.2, 0.04, "lowpass", 260); }
      else if (midi < 58) toneHit(ctx, dest, t, v * 0.8, 205, 150, 0.13, "triangle");
      else { noiseHit(ctx, dest, t, v * 0.65, 0.07, "bandpass", 1400, 2); toneHit(ctx, dest, t, v * 0.25, 330, 220, 0.05, "triangle"); }
      break;
    case "tabla":
      if (midi < 55) { toneHit(ctx, dest, t, v * 0.9, 78, 42, 0.34); noiseHit(ctx, dest, t, v * 0.2, 0.05, "lowpass", 240); }
      else { noiseHit(ctx, dest, t, v * 0.6, 0.06, "bandpass", 1000, 9); toneHit(ctx, dest, t, v * 0.3, 520, 380, 0.05, "triangle"); }
      break;
    case "bodhran":
      toneHit(ctx, dest, t, v * 0.9, 105, 60, 0.27);
      noiseHit(ctx, dest, t, v * 0.25, 0.07, "lowpass", 420);
      if (midi >= 42) noiseHit(ctx, dest, t + 0.02, v * 0.3, 0.025, "bandpass", 2300, 3);
      break;
    case "timbales":
      if (midi >= 45) { noiseHit(ctx, dest, t, v * 0.6, 0.07, "bandpass", 1100, 3); toneHit(ctx, dest, t, v * 0.3, 430, 300, 0.05, "triangle"); }
      else { toneHit(ctx, dest, t, v * 0.85, 250, 150, 0.18); noiseHit(ctx, dest, t, v * 0.2, 0.03, "bandpass", 2000, 2); }
      break;
    case "leguero":
      toneHit(ctx, dest, t, v * 0.95, 86, 46, 0.34);
      noiseHit(ctx, dest, t, v * 0.3, 0.05, "lowpass", 320);
      break;
    case "quijada":
      noiseHit(ctx, dest, t, v * 0.5, 0.3, "bandpass", 380, 1.6);
      [0.04, 0.09, 0.15].forEach((off) => noiseHit(ctx, dest, t + off, v * 0.4, 0.018, "bandpass", 2700, 7));
      break;
    case "cajita":
      if (midi >= 73) { toneHit(ctx, dest, t, v * 0.7, 760, 640, 0.09, "triangle"); noiseHit(ctx, dest, t, v * 0.3, 0.05, "bandpass", 2400, 4); }
      else { toneHit(ctx, dest, t, v * 0.75, 880, 760, 0.045, "triangle"); noiseHit(ctx, dest, t, v * 0.35, 0.025, "bandpass", 3100, 6); }
      break;
    case "cajavallenata":
      toneHit(ctx, dest, t, v * 0.7, 245, 165, 0.13, "triangle");
      noiseHit(ctx, dest, t, v * 0.35, 0.05, "bandpass", 1500, 2.2);
      break;
    case "bomba":
      if (midi >= 42) { noiseHit(ctx, dest, t, v * 0.65, 0.08, "bandpass", 1700, 2.4); toneHit(ctx, dest, t, v * 0.3, 360, 240, 0.05, "triangle"); }
      else { toneHit(ctx, dest, t, v * 0.95, 112, 62, 0.3); noiseHit(ctx, dest, t, v * 0.25, 0.04, "lowpass", 420); }
      break;
    case "furruco": {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(118, t);
      osc.frequency.linearRampToValueAtTime(86, t + 0.55);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 7.5;
      const lg = ctx.createGain(); lg.gain.value = 9;
      lfo.connect(lg).connect(osc.frequency);
      const f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 420; f.Q.value = 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v * 0.5, t + 0.06);
      g.gain.setTargetAtTime(0.0001, t + 0.55, 0.12);
      osc.connect(f).connect(g).connect(dest);
      noiseHit(ctx, dest, t, v * 0.16, 0.7, "bandpass", 240, 3);
      osc.start(t); lfo.start(t); osc.stop(t + 1.1); lfo.stop(t + 1.1);
      break;
    }
    default:
      toneHit(ctx, dest, t, v, 200, 80, 0.2);
  }
}

/* ---------- canal ---------- */
interface ChannelStrip {
  input: GainNode;
  filter: BiquadFilterNode;
  panner: StereoPannerNode;
  fader: GainNode;
  analyser: AnalyserNode;
  state: ChannelState;
  level: number;
}

interface Session {
  comp: Composition;
  channels: Record<string, ChannelState>;
  bpm: number;
  startCtxTime: number;
  startBeat: number;
  spb: number;            // segundos por beat
  status: "playing" | "paused" | "stopped";
  pausedBeat: number;
  sourceId: string;
  sourceKind: "session" | "track";
  dark: number;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private comp: DynamicsCompressorNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private sat: WaveShaperNode | null = null;
  private reverbSend: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private strips = new Map<string, ChannelStrip>();
  private session: Session | null = null;
  private timer: number | null = null;
  private scheduledIdx = 0;
  private listeners = new Set<(s: EngineSnapshot) => void>();
  masterVolume = 0.85;

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.masterVolume;
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.knee.value = 22;
    this.comp.ratio.value = 3.2;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.24;
    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 2048;
    this.masterAnalyser.smoothingTimeConstant = 0.82;
    /* saturación suave (calidez) + bus de reverb por convolución */
    this.sat = this.ctx.createWaveShaper();
    this.sat.curve = makeSatCurve(2.4);
    this.sat.oversample = "2x";
    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = 0.32;
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = makeImpulse(this.ctx, 2.3, 2.8);
    this.master.connect(this.sat);
    this.master.connect(this.reverbSend);
    this.reverbSend.connect(this.convolver);
    this.convolver.connect(this.sat);
    this.sat.connect(this.comp).connect(this.masterAnalyser).connect(this.ctx.destination);
  }

  getAnalyser(): AnalyserNode | null { return this.masterAnalyser; }

  /* el parámetro «Espacio» del estilo controla la mezcla de reverb */
  setSpace(space: number) {
    if (this.ctx && this.reverbSend) {
      const wet = 0.1 + Math.max(0, Math.min(1, space)) * 0.62;
      this.reverbSend.gain.setTargetAtTime(wet, this.ctx.currentTime, 0.08);
    }
  }

  setMasterVolume(v: number) {
    this.masterVolume = v;
    if (this.ctx && this.master)
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  }

  private strip(id: string): ChannelStrip | null {
    if (!this.ctx || !this.master) return null;
    let s = this.strips.get(id);
    if (!s) {
      const input = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowshelf";
      filter.frequency.value = 220;
      const panner = this.ctx.createStereoPanner();
      const fader = this.ctx.createGain();
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      input.connect(filter).connect(panner).connect(fader).connect(analyser).connect(this.master);
      s = { input, filter, panner, fader, analyser, state: { volume: 0.75, pan: 0, mute: false, solo: false }, level: 0 };
      this.strips.set(id, s);
    }
    return s;
  }

  setChannel(id: string, ch: ChannelState) {
    const s = this.strip(id);
    if (!s || !this.ctx) return;
    s.state = { ...ch };
    const anySolo = [...this.strips.values()].some((x) => x.state.solo);
    const audible = !ch.mute && (!anySolo || ch.solo);
    s.fader.gain.setTargetAtTime(audible ? ch.volume * ch.volume : 0, this.ctx.currentTime, 0.025);
    s.panner.pan.setTargetAtTime(ch.pan, this.ctx.currentTime, 0.03);
    const dark = this.session?.dark ?? 0;
    s.filter.gain.setTargetAtTime(-dark * 6, this.ctx.currentTime, 0.05);
  }

  syncChannels(channels: Record<string, ChannelState>) {
    for (const [id, ch] of Object.entries(channels)) this.setChannel(id, ch);
  }

  getLevel(id: string): number {
    const s = this.strips.get(id);
    if (!s) return 0;
    const arr = new Uint8Array(s.analyser.frequencyBinCount);
    s.analyser.getByteTimeDomainData(arr);
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      const v = (arr[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / arr.length) * 3.2);
  }

  /* ---------- reproducción ---------- */

  play(comp: Composition, channels: Record<string, ChannelState>, sourceId: string, sourceKind: "session" | "track") {
    this.init();
    if (!this.ctx) return;
    this.stopScheduler();
    this.session = {
      comp, channels, bpm: comp.bpm,
      startCtxTime: this.ctx.currentTime + 0.12,
      startBeat: 0,
      spb: 60 / comp.bpm,
      status: "playing",
      pausedBeat: 0,
      sourceId, sourceKind,
      dark: 1 - comp.bright,
    };
    this.scheduledIdx = 0;
    this.syncChannels(channels);
    this.setSpace(comp.space);
    this.timer = window.setInterval(() => this.tick(), 40);
    this.emit();
  }

  pause() {
    if (!this.ctx || !this.session || this.session.status !== "playing") return;
    this.session.pausedBeat = this.currentBeat();
    this.session.status = "paused";
    this.stopScheduler();
    /* silencio inmediato con fade corto (sin clics) */
    for (const s of this.strips.values())
      s.fader.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    this.emit();
  }

  resume() {
    if (!this.ctx || !this.session || this.session.status !== "paused") return;
    this.session.startCtxTime = this.ctx.currentTime + 0.12;
    this.session.startBeat = this.session.pausedBeat;
    this.session.status = "playing";
    this.syncChannels(this.session.channels);
    this.timer = window.setInterval(() => this.tick(), 40);
    this.emit();
  }

  stop() {
    this.stopScheduler();
    if (this.ctx && this.session) {
      for (const s of this.strips.values())
        s.fader.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    }
    this.session = null;
    this.emit();
  }

  setBpm(bpm: number) {
    if (!this.ctx || !this.session || this.session.status !== "playing") return;
    const beat = this.currentBeat();
    this.session.bpm = bpm;
    this.session.spb = 60 / bpm;
    this.session.startCtxTime = this.ctx.currentTime;
    this.session.startBeat = beat;
  }

  private stopScheduler() {
    if (this.timer !== null) { window.clearInterval(this.timer); this.timer = null; }
  }

  private currentBeat(): number {
    if (!this.ctx || !this.session) return 0;
    if (this.session.status === "paused") return this.session.pausedBeat;
    return this.session.startBeat + (this.ctx.currentTime - this.session.startCtxTime) / this.session.spb;
  }

  private tick() {
    const s = this.session;
    if (!s || !this.ctx || s.status !== "playing") return;
    const horizon = this.ctx.currentTime + 0.35;
    const events = s.comp.events;
    while (this.scheduledIdx < events.length) {
      const e = events[this.scheduledIdx];
      const t = s.startCtxTime + (e.beat - s.startBeat) * s.spb;
      if (t > horizon) break;
      if (t >= this.ctx.currentTime - 0.05) this.scheduleEvent(e, Math.max(t, this.ctx.currentTime + 0.01));
      this.scheduledIdx++;
    }
    if (this.scheduledIdx >= events.length) {
      const endT = s.startCtxTime + (s.comp.totalBeats - s.startBeat) * s.spb + 1.4;
      if (this.ctx.currentTime > endT) this.stop();
    }
  }

  private scheduleEvent(e: CompEvent, t: number) {
    const s = this.session;
    if (!s || !this.ctx) return;
    const def = INSTRUMENT_MAP[e.ch];
    if (!def) return;
    const dest = this.strip(e.ch)?.input;
    if (!dest) return;
    const dur = e.dur * s.spb;

    if ((def.drum || def.family === "drums" || def.family === "percussion") && !def.arch) {
      let kind: string = def.drum ?? "kick";
      if (def.id === "drumkit") kind = KIT_MAP[e.midi] ?? "kick";
      else if (def.id === "snareline") kind = "snare";
      else if (def.id === "bassdrum") kind = "kick";
      playDrum(this.ctx, dest, kind, e.midi, t, e.vel);
    } else if (def.arch) {
      playMelodic(this.ctx, dest, def.arch, e.midi, t, Math.max(0.12, dur), e.vel, s.dark);
    }
  }

  /* ---------- estado ---------- */

  snapshot(): EngineSnapshot {
    const s = this.session;
    if (!s) return { status: "stopped", positionBeats: 0, totalBeats: 0, bpm: 120, sourceId: "", sourceKind: "session" };
    return {
      status: s.status,
      positionBeats: this.currentBeat(),
      totalBeats: s.comp.totalBeats,
      bpm: s.bpm,
      sourceId: s.sourceId,
      sourceKind: s.sourceKind,
    };
  }

  subscribe(fn: (s: EngineSnapshot) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
  }
}

export const engine = new AudioEngine();

/* ============================================================
   RENDER OFFLINE → WAV (exportación de la obra)
   ============================================================ */

export async function renderCompositionToWav(
  comp: Composition, channels: Record<string, ChannelState>,
): Promise<Blob> {
  const sr = 44100;
  const length = Math.ceil((comp.durationSec + 1) * sr);
  const ctx = new OfflineAudioContext(2, length, sr);

  const master = ctx.createGain();
  master.gain.value = 0.85;
  const compN = ctx.createDynamicsCompressor();
  compN.threshold.value = -14;
  compN.knee.value = 22;
  compN.ratio.value = 3.2;
  /* misma cadena que en vivo: saturación + reverb por convolución según el espacio */
  const sat = ctx.createWaveShaper();
  sat.curve = makeSatCurve(2.4);
  sat.oversample = "2x";
  const send = ctx.createGain();
  send.gain.value = 0.1 + Math.max(0, Math.min(1, comp.space)) * 0.62;
  const conv = ctx.createConvolver();
  conv.buffer = makeImpulse(ctx, 2.3, 2.8);
  master.connect(sat);
  master.connect(send);
  send.connect(conv);
  conv.connect(sat);
  sat.connect(compN).connect(ctx.destination);

  const strips = new Map<string, { input: GainNode; dark: number }>();
  const anySolo = Object.values(channels).some((c) => c.solo);
  const spb = 60 / comp.bpm;
  const dark = 1 - comp.bright;

  const getStrip = (id: string) => {
    let s = strips.get(id);
    if (!s) {
      const ch = channels[id] ?? { volume: 0.75, pan: 0, mute: false, solo: false };
      const input = ctx.createGain();
      const pan = ctx.createStereoPanner();
      const audible = !ch.mute && (!anySolo || ch.solo);
      input.gain.value = audible ? ch.volume * ch.volume : 0;
      pan.pan.value = ch.pan;
      input.connect(pan).connect(master);
      s = { input, dark };
      strips.set(id, s);
    }
    return s;
  };

  for (const e of comp.events) {
    const def = INSTRUMENT_MAP[e.ch];
    if (!def) continue;
    const t = 0.1 + e.beat * spb;
    const strip = getStrip(e.ch);
    if ((def.drum || def.family === "drums" || def.family === "percussion") && !def.arch) {
      let kind: string = def.drum ?? "kick";
      if (def.id === "drumkit") kind = KIT_MAP[e.midi] ?? "kick";
      else if (def.id === "snareline") kind = "snare";
      else if (def.id === "bassdrum") kind = "kick";
      playDrum(ctx, strip.input, kind, e.midi, t, e.vel);
    } else if (def.arch) {
      playMelodic(ctx, strip.input, def.arch, e.midi, t, Math.max(0.12, e.dur * spb), e.vel, dark);
    }
  }

  const buffer = await ctx.startRendering();
  return audioBufferToWav(buffer);
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const len = buffer.length * numCh * 2 + 44;
  const ab = new ArrayBuffer(len);
  const view = new DataView(ab);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };

  writeStr(0, "RIFF");
  view.setUint32(4, len - 8, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, len - 44, true);

  const chans: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numCh; c++) {
      const v = Math.max(-1, Math.min(1, chans[c][i]));
      view.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
