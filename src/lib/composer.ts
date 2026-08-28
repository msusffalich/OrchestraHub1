import type {
  CompEvent, Composition, GenParams, Orchestra, PromptAnalysis, Lang,
} from "./core";
import { clamp, chance, hashString, irange, mulberry32, pick } from "./core";
import { INSTRUMENT_MAP } from "./instruments";
import { GENRE_MAP, fusedGenres, fusedBpmRange, spaceBrightOf } from "./genres";

/* ============================================================
   MOTOR PROMPT-A-MÚSICA (compositor determinista local)
   1) analyzePrompt  → carácter, modo, compás, tempo, líder…
   2) compose        → partitura por canales (stems) con fusión
      de estilos y parámetros técnicos del estilo elegido.
   ============================================================ */

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

interface MoodDef {
  minor: boolean;
  energy: number;
  progMaj: number[][];
  progMin: number[][];
}

const MOODS: Record<string, MoodDef> = {
  heroic:     { minor: false, energy: 0.88, progMaj: [[0, 4, 5, 3], [0, 6, 3, 4]], progMin: [[0, 5, 3, 4]] },
  bright:     { minor: false, energy: 0.78, progMaj: [[0, 3, 4, 0], [0, 4, 5, 3]], progMin: [[0, 3, 4, 0]] },
  love:       { minor: false, energy: 0.55, progMaj: [[0, 5, 3, 4], [0, 3, 5, 4]], progMin: [[0, 3, 5, 2]] },
  melancholy: { minor: true,  energy: 0.45, progMaj: [[0, 5, 3, 4]], progMin: [[0, 5, 2, 6], [0, 3, 5, 4]] },
  dark:       { minor: true,  energy: 0.62, progMaj: [[0, 1, 5, 4]], progMin: [[0, 1, 0, 6], [0, 5, 1, 4]] },
  nocturne:   { minor: true,  energy: 0.42, progMaj: [[0, 5, 3, 4]], progMin: [[0, 3, 5, 6], [0, 5, 3, 4]] },
  jazzy:      { minor: true,  energy: 0.55, progMaj: [[1, 4, 0, 5]], progMin: [[0, 3, 1, 4], [0, 5, 1, 4]] },
  calm:       { minor: false, energy: 0.5,  progMaj: [[0, 3, 0, 4], [0, 5, 3, 4]], progMin: [[0, 5, 2, 6]] },
};

export const MOOD_LABELS: Record<string, { es: string; en: string }> = {
  heroic: { es: "Heroico", en: "Heroic" },
  bright: { es: "Luminoso", en: "Bright" },
  love: { es: "Romántico", en: "Romantic" },
  melancholy: { es: "Melancólico", en: "Melancholy" },
  dark: { es: "Oscuro", en: "Dark" },
  nocturne: { es: "Nocturno", en: "Nocturne" },
  jazzy: { es: "Jazzy", en: "Jazzy" },
  calm: { es: "Sereno", en: "Calm" },
};

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

/* el carácter por defecto de cada estilo de la tabla global */
const GENRE_MOOD: Record<string, string> = {
  jazz: "jazzy", marching: "heroic", latin: "bright", rock: "bright", electro: "bright",
  cinematic: "nocturne", chamber: "calm", symphonic: "calm", metal: "dark", indie: "calm",
  pop: "bright", dancepop: "bright", techno: "dark", reggaeton: "bright", hiphop: "nocturne",
  bachata: "love", merengue: "bright", tango: "melancholy", flamenco: "dark", mariachi: "bright",
  bossa: "calm", blues: "melancholy", soul: "love", reggae: "calm",
  afrobeats: "bright", mandinga: "nocturne", soukous: "bright", amapiano: "jazzy",
  kpop: "bright", jpop: "bright", filmi: "love", balkan: "bright", slavic: "nocturne", celtic: "bright",
  valscriollo: "melancholy", festejo: "bright", andina: "bright", chicha: "bright",
  vallenato: "bright", champeta: "bright", bombaplena: "bright", salsapr: "bright", joropo: "bright",
};

/* ---------------- 1 · Análisis del prompt ---------------- */

export function analyzePrompt(prompt: string, orch: Orchestra): PromptAnalysis {
  const genre = GENRE_MAP[orch.genreId] ?? GENRE_MAP.symphonic;
  const t = norm(prompt || " ");
  const rng = mulberry32(hashString(t) ^ 0x9e37);

  let meter: 2 | 3 | 4 = genre.meter;
  if (has(t, ["vals", "waltz", "valse"])) meter = 3;
  else if (has(t, ["marcha", "march", "fanfarria", "fanfare"])) meter = 2;

  let moodKey = "calm";
  if (has(t, ["heroic", "triunfal", "triumph", "epic", "epica", "gloria", "victori", "valiente", "brave", "batalla", "battle"])) moodKey = "heroic";
  else if (has(t, ["melanco", "triste", "sad", "llor", "nostal", "pena", "sorrow", "elegia"])) moodKey = "melancholy";
  else if (has(t, ["noctur", "noche", "night", "medianoche", "midnight", "luna", "moon"])) moodKey = "nocturne";
  else if (has(t, ["oscur", "dark", "tensi", "misterio", "sombra", "shadow", "peligro", "threat"])) moodKey = "dark";
  else if (has(t, ["roman", "amor", "love", "dulce", "sweet", "tierna", "carino"])) moodKey = "love";
  else if (has(t, ["jazz", "swing", "blues", "bossa", "be-bop", "bebop"])) moodKey = "jazzy";
  else if (has(t, ["alegre", "feliz", "happy", "joy", "fiesta", "baila", "dance", "jugueton", "playful", "sunshine"])) moodKey = "bright";
  else if (GENRE_MOOD[genre.id]) moodKey = GENRE_MOOD[genre.id];

  const mood = MOODS[moodKey];
  const rain = has(t, ["lluvia", "lluvioso", "rain", "drizzle", "tormenta", "storm", "llovizna"]);

  // tempo: parte del centro del rango técnico del estilo
  let bpm = Math.round((genre.bpmMin + genre.bpmMax) / 2);
  if (moodKey === "heroic") bpm = irange(rng, genre.bpmMin, Math.min(genre.bpmMax, genre.bpmMin + 20));
  if (moodKey === "melancholy" || moodKey === "nocturne") bpm = irange(rng, genre.bpmMin, Math.min(genre.bpmMax, genre.bpmMin + 18));
  if (has(t, ["adagio", "lento", "lentisimo", "slow", "muy lento"])) bpm = genre.bpmMin;
  if (has(t, ["andante", "caminando", "moderato", "moderado"])) bpm = Math.round((genre.bpmMin + genre.bpmMax) / 2);
  if (has(t, ["allegro", "rapido", "fast", "vivace", "deprisa"])) bpm = genre.bpmMax;
  if (has(t, ["presto", "frenetic", "muy rapido"])) bpm = genre.bpmMax;
  bpm = clamp(bpm, genre.bpmMin, genre.bpmMax);

  let leaderId: string | undefined;
  const explicitLead = has(t, ["lider", "lead", "solo", "solista", "protagonista"]);
  for (const id of orch.instrumentIds) {
    const def = INSTRUMENT_MAP[id];
    if (!def) continue;
    if (def.roles.includes("melody") && def.aliases.some((a) => t.includes(norm(a)))) {
      leaderId = id;
      if (!explicitLead) break;
    }
  }
  if (leaderId && !explicitLead && chance(rng, 0.35)) leaderId = undefined;

  let energy = mood.energy + (rain ? -0.06 : 0);
  if (moodKey === "jazzy" && rain) energy = 0.42;
  energy = clamp(energy + (rng() - 0.5) * 0.06, 0.25, 0.95);

  let swing = genre.swing;
  if (moodKey === "jazzy") swing = Math.max(swing, 0.2);
  if (meter !== 4) swing = swing * 0.5;

  return {
    bpm, meter, moodKey, minor: mood.minor, energy, swing, rain,
    leaderId, sections: 2,
  };
}

/* ---------------- utilidades musicales ---------------- */

const scaleNote = (root: number, scale: number[], deg: number) => {
  const oct = Math.floor(deg / 7);
  const idx = ((deg % 7) + 7) % 7;
  return root + scale[idx] + 12 * oct;
};

const clampToRange = (midi: number, range: [number, number]) => {
  let m = midi;
  while (m < range[0]) m += 12;
  while (m > range[1]) m -= 12;
  return clamp(m, range[0], range[1]);
};

const EV = (beat: number, ch: string, midi: number, dur: number, vel: number): CompEvent => ({
  beat, ch, midi: Math.round(midi), dur, vel: clamp(vel, 0.05, 1),
});

const STEPS = { 4: 16, 3: 12, 2: 8 } as Record<number, number>;

/* ---------- patrones de batería (pasos por compás) ---------- */
function drumPatternEvents(
  style: string, meter: number, barStart: number, energy: number,
  rng: () => number, out: CompEvent[], drumCh: string,
) {
  const steps = STEPS[meter];
  const at = (step: number) => barStart + (step * meter) / steps;
  const v = (x: number) => x * (0.55 + energy * 0.55);
  const push = (step: number, midi: number, vel: number, dur = 0.22) => {
    if (step < steps && vel > 0.03) out.push(EV(at(step), drumCh, midi, dur, vel));
  };

  if (style === "rock" || style === "jpop" || style === "kpop") {
    [0, 8, 10].forEach((s) => push(s, 36, v(0.95), 0.3));
    [4, 12].forEach((s) => push(s, 38, v(0.85), 0.2));
    for (let s = 0; s < steps; s += 2) push(s, 42, v(s % 4 === 0 ? 0.55 : 0.38), 0.06);
    if (style === "jpop" && chance(rng, 0.5)) push(14, 38, v(0.6), 0.18);
    if (style === "kpop") { push(14, 38, v(0.55), 0.18); push(6, 42, v(0.4), 0.05); }
  } else if (style === "jazz" || style === "blues" || style === "soul") {
    [0, 4, 8, 12].forEach((s) => push(s, 36, style === "soul" ? 0.5 : 0.16, 0.25));
    const rideSteps = style === "soul" ? [0, 4, 8, 12] : [0, 3, 4, 7, 8, 11, 12, 15];
    rideSteps.forEach((s) => push(s, style === "soul" ? 42 : 51, v(s % 4 === 0 ? 0.5 : 0.32), 0.14));
    if (chance(rng, 0.5)) push(4, 38, style === "soul" ? 0.6 : 0.18, 0.15);
    if (chance(rng, 0.5)) push(12, 38, style === "soul" ? 0.65 : 0.22, 0.15);
    if (style === "blues") for (let s = 0; s < steps; s += 4) push(s + 2, 42, v(0.3), 0.05);
  } else if (style === "electro" || style === "house") {
    [0, 4, 8, 12].forEach((s) => push(s, 36, 1, 0.3));
    [4, 12].forEach((s) => push(s, 39, v(0.8), 0.18));
    [2, 6, 10, 14].forEach((s) => push(s, 42, v(style === "house" ? 0.4 : 0.55), 0.05));
    if (chance(rng, 0.4)) push(14, 46, v(0.45), 0.35);
    if (style === "house" && chance(rng, 0.5)) [1, 5, 9, 13].forEach((s) => push(s, 42, v(0.3), 0.04));
  } else if (style === "march" || style === "balkan") {
    for (let s = 0; s < steps; s++) push(s, 38, v(s % 4 === 0 ? 0.9 : s % 2 === 0 ? 0.55 : 0.4), 0.16);
    [0, Math.floor(steps / 2)].forEach((s) => push(s, 36, v(1), 0.3));
  } else if (style === "latin" || style === "afro" || style === "cumbia") {
    [0, 8].forEach((s) => push(s, 36, v(0.75), 0.28));
    if (style === "afro") push(11, 36, v(0.5), 0.25);
    [4, 12].forEach((s) => push(s, 37, v(0.5), 0.08));
    for (let s = 0; s < steps; s++) push(s, 42, v(s % 2 === 0 ? 0.4 : 0.26), 0.05);
    if (style === "cumbia") push(6, 46, v(0.35), 0.3);
  } else if (style === "dembow" || style === "hiphop") {
    if (style === "dembow") {
      [0, 4, 8, 12].forEach((s) => push(s, 36, v(0.95), 0.3));
      [3, 7, 11, 15].forEach((s) => push(s, 38, v(0.8), 0.16));
      [2, 6, 10, 14].forEach((s) => push(s, 42, v(0.35), 0.05));
    } else {
      [0, 7, 10].forEach((s) => push(s, 36, v(0.9), 0.3));
      [4, 12].forEach((s) => push(s, 38, v(0.95), 0.22));
      for (let s = 0; s < steps; s += 2) push(s, 42, v(0.3), 0.05);
    }
  } else if (style === "bossa" || style === "onedrop") {
    if (style === "bossa") {
      [0, 8].forEach((s) => push(s, 36, v(0.5), 0.3));
      [12].forEach((s) => push(s, 38, v(0.35), 0.15));
      for (let s = 0; s < steps; s += 2) push(s, 51, v(0.3), 0.12);
    } else {
      [8].forEach((s) => push(s, 36, v(0.8), 0.35));
      [8].forEach((s) => push(s, 38, v(0.75), 0.2));
      [0, 4, 12].forEach((s) => push(s, 42, v(0.35), 0.08));
    }
  } else if (style === "waltz") {
    push(0, 36, v(0.85), 0.32);
    [Math.floor(steps / 3), Math.floor((2 * steps) / 3)].forEach((s) => push(s, 42, v(0.35), 0.07));
  }
}

/* ---------- patrones de percusión tradicional ---------- */
function percPatternEvents(
  genreId: string, meter: number, barStart: number, energy: number,
  rng: () => number, out: CompEvent[], instId: string, kind: string,
) {
  const steps = STEPS[meter];
  const at = (step: number) => barStart + (step * meter) / steps;
  const v = (x: number) => x * (0.55 + energy * 0.5);
  const latin = genreId === "latin" || genreId === "salsapr" || genreId === "vallenato";
  const hit = (s: number, midi: number, vel: number, dur = 0.18) => {
    if (s < steps) out.push(EV(at(s), instId, midi, dur, v(vel)));
  };

  if (kind === "conga") {
    if (latin) [[2, 0.5], [4, 0.85], [6, 0.5], [10, 0.5], [12, 0.85], [14, 0.55]]
      .forEach(([s, vel]) => hit(s, 62 + (s % 3), vel));
    else if (chance(rng, 0.4)) hit(4, 62, 0.5);
  } else if (kind === "clave") {
    if (latin) [0, 3, 6, 10, 12].forEach((s) => hit(s, 76, 0.75, 0.09));
  } else if (kind === "shaker") {
    const every = latin || genreId === "electro" || genreId === "afrobeats" ? 1 : 2;
    for (let s = 0; s < steps; s += every) hit(s, 70, s % 4 === 0 ? 0.45 : 0.3, 0.09);
  } else if (kind === "tambourine") {
    for (let s = 0; s < steps; s += Math.floor(steps / meter)) hit(s, 70, s === 0 ? 0.5 : 0.36, 0.1);
    if (energy > 0.6) for (let s = 2; s < steps; s += 4) hit(s, 70, 0.28, 0.08);
  } else if (kind === "cowbell") {
    if (latin) [4, 12].forEach((s) => hit(s, 68, 0.6, 0.12));
    else if (genreId === "marching") [0, 4].forEach((s) => hit(s, 68, 0.5, 0.12));
  } else if (kind === "cajon") {
    ([[0, 36, 0.85], [2, 42, 0.4], [4, 42, 0.7], [6, 42, 0.35], [8, 36, 0.8], [10, 42, 0.4], [12, 42, 0.7], [14, 42, 0.45]] as [number, number, number][])
      .forEach(([s, m, vel]) => hit(s, m, vel, 0.16));
  } else if (kind === "clap") {
    ([[0, 0.8], [2, 0.4], [3, 0.5], [4, 0.7], [6, 0.45], [8, 0.75], [10, 0.4], [11, 0.5], [12, 0.7], [14, 0.5]] as [number, number][])
      .forEach(([s, vel]) => hit(s, 39, vel, 0.12));
  } else if (kind === "castanets") {
    for (let s = 0; s < steps; s += 2) hit(s, s % 4 === 0 ? 76 : 79, s % 4 === 0 ? 0.55 : 0.38, 0.06);
    if (15 < steps && chance(rng, 0.5)) hit(15, 76, 0.5, 0.06);
  } else if (kind === "scraper" && instId === "guira") {
    for (let s = 0; s < steps; s++) hit(s, 70, s % 2 === 0 ? 0.6 : 0.4, 0.12);
  } else if (kind === "scraper") {
    [0, 4, 8, 12].forEach((s) => hit(s, 70, 0.5, 0.45));
    [2, 6, 10, 14].forEach((s) => hit(s, 70, 0.35, 0.15));
  } else if (kind === "tambora") {
    [0, 4].forEach((s) => hit(s, 36, 0.9, 0.2));
    [2, 6].forEach((s) => hit(s, 40, 0.75, 0.12));
    if (energy > 0.7) [1, 3, 5, 7].forEach((s) => hit(s, 40, 0.4, 0.1));
  } else if (kind === "djembe") {
    ([[0, 36, 0.85], [3, 52, 0.6], [4, 60, 0.75], [6, 52, 0.5], [8, 36, 0.8], [11, 52, 0.6], [12, 60, 0.75], [14, 52, 0.55]] as [number, number, number][])
      .forEach(([s, m, vel]) => hit(s, m, vel * (0.6 + energy * 0.4)));
  } else if (kind === "tabla") {
    [0, 6, 8, 14].forEach((s) => hit(s, 45, 0.8, 0.3));
    [2, 4, 10, 12].forEach((s) => hit(s, 62, 0.7, 0.1));
    if (chance(rng, 0.5)) hit(15, 65, 0.55, 0.1);
  } else if (kind === "bodhran") {
    [0, 6].forEach((s) => hit(s, 36, 0.85, 0.24));
    [3, 9].forEach((s) => hit(s, 36, 0.5, 0.2));
    [1, 2, 4, 5, 7, 8, 10, 11].forEach((s) => { if (chance(rng, 0.6)) hit(s, 42, 0.28, 0.08); });
  } else if (kind === "timbales") {
    [0, 8].forEach((s) => hit(s, 40, 0.6, 0.16));
    [1, 2, 4, 6, 8, 10, 12, 14].forEach((s) => hit(s, 48, s % 4 === 1 ? 0.6 : 0.42, 0.08));
  } else if (kind === "leguero") {
    if (meter === 2) [[0, 0.9], [3, 0.5], [4, 0.8], [7, 0.5]].forEach(([s, vel]) => hit(s, 36, vel, 0.25));
    else [0, 8].forEach((s) => hit(s, 36, 0.8, 0.25));
  } else if (kind === "quijada") {
    const pts = meter === 3 ? [2, 5, 8, 11] : [2, 6, 10, 14];
    pts.forEach((s) => hit(s, 70, 0.5, 0.3));
    if (chance(rng, 0.5)) hit(steps - 1, 70, 0.35, 0.3);
  } else if (kind === "cajita") {
    const accents = [0.7, 0.32, 0.5, 0.32, 0.75, 0.32, 0.5, 0.42];
    for (let s = 0; s < steps; s++) hit(s, s % 2 === 0 ? 70 : 74, accents[s % accents.length] ?? 0.4, 0.08);
  } else if (kind === "cajavallenata") {
    [0, 4, 8, 12].forEach((s) => hit(s, 38, 0.75, 0.14));
    [2, 6, 10, 14].forEach((s) => hit(s, 40, 0.4, 0.1));
    if (chance(rng, 0.4)) hit(steps - 1, 40, 0.5, 0.1);
  } else if (kind === "bomba") {
    [[0, 36, 0.85], [3, 42, 0.5], [6, 42, 0.6], [8, 36, 0.8], [11, 42, 0.5], [14, 42, 0.55]]
      .forEach(([s, m, vel]) => hit(s, m, vel, 0.2));
    if (chance(rng, 0.45)) hit(steps - 1, 46, 0.6, 0.2);
  } else if (kind === "furruco") {
    out.push(EV(at(0), instId, 36, meter * 0.42, v(0.7)));
    out.push(EV(at(Math.floor(steps / 2)), instId, 36, meter * 0.42, v(0.55)));
  }
  /* timpani: acentos armónicos programados en el bucle principal */
}

/* ---------------- 2 · Composición completa ---------------- */

export function compose(
  analysis: PromptAnalysis, orch: Orchestra, seed: number, lang: Lang,
  override?: Partial<GenParams>,
): Composition {
  const genre = GENRE_MAP[orch.genreId] ?? GENRE_MAP.symphonic;
  const rng = mulberry32(seed);
  const mood = MOODS[analysis.moodKey] ?? MOODS.calm;

  /* --- parámetros efectivos (ajustes del usuario ganan) --- */
  const [bMin, bMax] = fusedBpmRange(orch);
  const bpm = clamp(Math.round(override?.bpm ?? analysis.bpm), bMin, bMax);
  const meter = analysis.meter;
  const energy = clamp(override?.energy ?? analysis.energy, 0.2, 1);
  const swing = clamp(override?.swing ?? analysis.swing, 0, 0.45);
  const space = clamp(override?.space ?? spaceBrightOf(genre.id)[0], 0, 1);
  const bright = clamp(override?.bright ?? spaceBrightOf(genre.id)[1], 0, 1);

  const scale = analysis.minor ? MINOR : MAJOR;
  const pool = analysis.minor ? mood.progMin : mood.progMaj;
  const prog = pick(rng, pool);
  const rootMidi = 48 + irange(rng, 0, 5);
  const stepsPerBar = STEPS[meter];

  const bars = Math.round((bpm * 1.08) / meter) + (meter === 2 ? 6 : 0);
  const introBars = Math.max(2, Math.round(bars * 0.14));
  const outroBars = Math.max(2, Math.round(bars * 0.12));
  const bodyBars = bars - introBars - outroBars;
  const aBars = Math.ceil(bodyBars / 2);

  const events: CompEvent[] = [];
  const ids = orch.instrumentIds;
  const has = (id: string) => ids.includes(id);

  /* --- fusión de estilos: patrones alternados --- */
  const fused = fusedGenres(orch);
  const fusionIds = fused.slice(1).map((g) => g.id);
  const f1 = fused[1];
  const f2 = fused[2];

  /* --- asignación de roles --- */
  const MELODY_PREF = [
    "bandoneon", "sitar", "zampona", "harpllanera", "gaita", "kora", "koto", "balalaika",
    "harmonica", "accordion", "quena", "gaitacolo", "saxtenor", "trumpet", "flute", "violin",
    "synthlead", "eguitar", "clarinet", "oboe", "charango", "cuatro", "harp",
    "soprano", "tenor", "alto", "cello", "piano", "epiano", "celesta", "synthpad",
  ];
  let leadA = analysis.leaderId;
  if (!leadA) leadA = MELODY_PREF.find((p) => has(p) && INSTRUMENT_MAP[p].roles.includes("melody"));
  const leadB = MELODY_PREF.find((p) => has(p) && p !== leadA && INSTRUMENT_MAP[p].roles.includes("melody")) ?? leadA;

  const bassId = ["synthbass", "ebass", "contrabass", "tuba", "bassoon", "guitarron", "ngoni"].find((p) => has(p))
    ?? (has("cello") && !["cello"].includes(leadA ?? "") ? "cello" : undefined);
  const compIds = ["piano", "epiano", "nylon", "eguitar", "organ", "accordion", "flamencog", "vihuela", "balalaika", "charango", "cuatro", "mandolin", "harpllanera"].filter((p) => has(p) && p !== leadA);
  const padIds = ["synthpad", "organ", "horn", "trombone", "viola", "harp", "harmonium", "koto", "harpandes"].filter((p) => has(p) && p !== leadA);
  const stringSustain = ["violin", "cello", "viola"].filter((p) => has(p) && p !== leadA && p !== bassId);
  const kitIds = ["drumkit", "snareline", "bassdrum", "bomba"].filter(has);
  const percIds = ["congas", "claves", "shaker", "tambourine", "cowbell", "cajon", "palmas", "castanets", "guiro", "guira", "tambora", "djembe", "tabla", "bodhran", "timbales", "leguero", "quijada", "cajita", "cajavallenata", "furruco"].filter(has);
  const timpani = has("timpani") ? "timpani" : undefined;
  const voiceIds = ["soprano", "tenor", "alto", "basso"].filter((p) => has(p) && p !== leadA);

  /* --- motivos melódicos A y B --- */
  const makeMotif = (centerDeg: number) => {
    const steps = meter * 2;
    const notes: (number | null)[] = [];
    let deg = centerDeg + irange(rng, -1, 1);
    for (let i = 0; i < steps; i++) {
      const strong = i % 2 === 0;
      const restP = (1 - energy) * 0.28 + (strong ? 0.06 : 0.2);
      if (chance(rng, restP)) { notes.push(null); continue; }
      if (strong) {
        deg += chance(rng, 0.72) ? pick(rng, [-2, 0, 2, 4]) : pick(rng, [-1, 1]);
      } else {
        deg += pick(rng, [-1, 1, 0, -1, 1, 2, -2]);
      }
      deg = clamp(deg, centerDeg - 5, centerDeg + 7);
      notes.push(deg);
    }
    return notes;
  };
  const motifA = makeMotif(11);
  const motifB = makeMotif(13);

  /* --- bucle por compases --- */
  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * meter;
    const inIntro = bar < introBars;
    const inOutro = bar >= bars - outroBars;
    const inB = !inIntro && !inOutro && bar >= introBars + aBars;
    const chordDeg = prog[(bar + (inB ? 2 : 0)) % prog.length];
    const nextDeg = prog[(bar + 1 + (inB ? 2 : 0)) % prog.length];
    const seventh = fused.some((g) => g.seventh);
    const chordMidis = [0, 2, 4, ...(seventh ? [6] : [])].map((o) => chordDeg + o);
    let sectionGain = inIntro ? 0.55 : inOutro ? 0.75 : inB ? 0.95 : 1;
    if (inOutro) sectionGain *= 1 - ((bar - (bars - outroBars)) / (outroBars + 1)) * 0.55;
    const cadence = bar === bars - 1;

    /* fusión rítmica: la batería alterna entre estilos cada 2 compases;
       bajo y acompañamiento adoptan el estilo fusionado en la sección B */
    const barDrums = f1 && f1.drums !== "none" && (Math.floor(bar / 2) % 2 === 1) ? f1.drums : genre.drums;
    const barBass = inB && f1 ? f1.bassStyle : genre.bassStyle;
    const barComp = inB && f1 && f1.compStyle !== genre.compStyle ? f1.compStyle : genre.compStyle;
    const barGenreId = inB && f2 ? f2.id : inB && f1 ? f1.id : genre.id;

    /* batería */
    if (!inIntro || bar >= introBars - 1) {
      for (const kit of kitIds) {
        const def = INSTRUMENT_MAP[kit];
        if (def.family === "drums" || kit === "bomba") {
          const style = kit === "snareline" || kit === "bassdrum" ? "march"
            : kit === "bomba" ? "none" : barDrums === "none" ? "waltz" : barDrums;
          if (kit === "snareline") drumPatternEvents("march", meter, barStart, energy, rng, events, kit);
          else if (kit === "bassdrum") [0, meter / 2].forEach((b) => events.push(EV(barStart + b, kit, 36, 0.3, 0.9 * sectionGain)));
          else if (kit === "bomba") percPatternEvents(genre.id, meter, barStart, energy * sectionGain, rng, events, kit, "bomba");
          else drumPatternEvents(style, meter, barStart, energy * sectionGain, rng, events, kit);
        }
      }
    }

    /* percusión */
    for (const pid of percIds) {
      if (inIntro && pid !== "shaker" && pid !== "guira") continue;
      const pdef = INSTRUMENT_MAP[pid];
      percPatternEvents(genre.id, meter, barStart, energy * sectionGain, rng, events, pid, pdef.drum ?? pdef.arch ?? "");
    }

    /* timbales */
    if (timpani) {
      const tRange = INSTRUMENT_MAP.timpani.range;
      const note = clampToRange(rootMidi + scale[chordDeg % 7] - 12, tRange);
      if (!inIntro || bar === introBars - 1)
        events.push(EV(barStart, timpani, note, meter * 0.8, 0.62 * sectionGain * (chance(rng, 0.75) ? 1 : 0.6)));
      if (cadence) for (let r = 0; r < 10; r++) events.push(EV(barStart + r * 0.18, timpani, note, 0.3, 0.4 + r * 0.05));
    }

    /* bajo */
    if (bassId && !inIntro) {
      const def = INSTRUMENT_MAP[bassId];
      const r = def.range;
      const bassRoot = clampToRange(rootMidi + scale[chordDeg % 7] - 12, r);
      const bassFifth = clampToRange(bassRoot + 7, r);
      const st = barBass;
      const pushB = (beat: number, midi: number, dur: number, vel: number) =>
        events.push(EV(beat, bassId, midi, dur, vel * sectionGain));
      if (st === "sustain") {
        pushB(barStart, bassRoot, meter * 0.95, 0.85);
        if (inB && chance(rng, 0.5)) pushB(barStart + meter * 0.5, bassFifth, meter * 0.4, 0.6);
      } else if (st === "waltz") {
        pushB(barStart, bassRoot, 0.9, 0.9);
        pushB(barStart + 1, bassFifth, 0.9, 0.65);
        pushB(barStart + 2, bassFifth, 0.9, 0.65);
      } else if (st === "oompah") {
        pushB(barStart, bassRoot, 0.85, 0.9);
        pushB(barStart + 1, bassFifth, 0.85, 0.75);
      } else if (st === "walk") {
        const tones = [0, 2, 4, 6];
        const approach = clampToRange(scaleNote(rootMidi, scale, nextDeg) - 12 + pick(rng, [-1, 1]), r);
        [0, 1, 2].forEach((b) => pushB(barStart + b, clampToRange(rootMidi + scale[(chordDeg + pick(rng, tones)) % 7] - 12 + 12 * (chance(rng, 0.25) ? 1 : 0), r), 0.85, 0.8));
        pushB(barStart + 3, approach, 0.85, 0.78);
      } else if (st === "pulse") {
        for (let b = 0; b < meter; b += 0.5)
          pushB(barStart + b, b % 1 === 0 ? bassRoot : (chance(rng, 0.22) ? clampToRange(bassRoot + 12, r) : bassRoot), 0.42, b % 1 === 0 ? 0.9 : 0.62);
      } else if (st === "eighths") {
        for (let b = 0; b < meter; b += 0.5)
          pushB(barStart + b, chance(rng, 0.12) ? bassFifth : bassRoot, 0.42, b % 1 === 0 ? 0.88 : 0.6);
      } else if (st === "tumbao") {
        pushB(barStart + 0.75, bassFifth, 0.4, 0.8);
        pushB(barStart + 1.5, bassRoot, 0.9, 0.9);
        pushB(barStart + 2.75, bassFifth, 0.4, 0.75);
        pushB(barStart + 3.5, bassRoot, 0.5, 0.85);
      } else if (st === "dembow") {
        [0, 0.75, 1.5, 2, 2.75, 3.5].forEach((b, i) => pushB(barStart + b, i % 2 ? clampToRange(bassRoot + 12, r) : bassRoot, 0.5, i % 2 ? 0.6 : 0.9));
      } else if (st === "boom") {
        pushB(barStart, bassRoot, 1.4, 0.95);
        pushB(barStart + 2.5, chance(rng, 0.5) ? bassFifth : bassRoot, 1, 0.8);
      } else if (st === "habanera") {
        pushB(barStart, bassRoot, 0.7, 0.9);
        pushB(barStart + 0.75, bassRoot, 0.4, 0.7);
        pushB(barStart + 1.5, bassFifth, 0.9, 0.85);
        pushB(barStart + 3, bassRoot, 0.5, 0.7);
      } else if (st === "cumbia") {
        pushB(barStart, bassRoot, 0.8, 0.9);
        pushB(barStart + 1.5, bassFifth, 0.5, 0.7);
        pushB(barStart + 2, bassRoot, 0.8, 0.85);
        pushB(barStart + 3.5, bassFifth, 0.5, 0.7);
      } else if (st === "logdrum") {
        [[0, 0.95], [1.5, 0.55], [2, 0.85], [3, 0.5]].forEach(([b, vel]) =>
          pushB(barStart + b, chance(rng, 0.3) ? clampToRange(bassRoot + 12, r) : bassRoot, 0.7, vel));
      } else if (st === "bossa") {
        pushB(barStart, bassRoot, 1.1, 0.8);
        pushB(barStart + 1.5, bassFifth, 0.6, 0.65);
        pushB(barStart + 2.5, bassRoot, 0.9, 0.75);
      } else if (st === "bachata") {
        for (let b = 0; b < meter; b += 0.5)
          pushB(barStart + b, b % 1 === 0 ? bassRoot : bassFifth, 0.4, b % 1 === 0 ? 0.85 : 0.55);
      } else if (st === "onedrop") {
        pushB(barStart + 2, bassRoot, 1.2, 0.9);
        pushB(barStart, chance(rng, 0.5) ? bassFifth : bassRoot, 0.7, 0.65);
      }
    }

    /* acompañamiento armónico */
    if (!inIntro) {
      const compNotes = chordMidis.map((d) => clampToRange(rootMidi + scaleNote(0, scale, d) + 12, [48, 76]));
      for (const cid of compIds) {
        const st = barComp;
        const velBase = 0.5 * sectionGain * (cid === compIds[0] ? 1 : 0.7);
        const hit = (beat: number, dur: number, vel: number, arp = false) => {
          compNotes.forEach((n, i) => {
            if (arp && chance(rng, 0.2)) return;
            events.push(EV(arp ? beat + i * 0.12 : beat, cid, n, dur, vel * (i === 0 ? 1 : 0.85)));
          });
        };
        if (st === "sustain") hit(barStart, meter * 0.92, velBase * 0.9);
        else if (st === "offbeat") { for (let b = 1; b < meter; b += 2) hit(barStart + b, 0.5, velBase); }
        else if (st === "waltz") { for (let b = 1; b < meter; b++) hit(barStart + b, 0.85, velBase); }
        else if (st === "comp") { for (let b = 0; b < meter; b += 0.5) hit(barStart + b, 0.4, velBase * (b % 1 === 0 ? 1 : 0.72)); }
        else if (st === "arpeggio") { for (let b = 0; b < meter; b += 0.5) hit(barStart + b, 0.5, velBase * 0.9, true); }
        else if (st === "stab") {
          hit(barStart, 0.3, velBase * 1.15);
          if (chance(rng, 0.7)) hit(barStart + meter * 0.5, 0.3, velBase);
          if (energy > 0.6) hit(barStart + meter * 0.75, 0.22, velBase * 0.8);
        }
        else if (st === "montuno") {
          for (let b = 0; b < meter; b += 0.5) {
            const i = Math.round(b * 2) % compNotes.length;
            events.push(EV(barStart + b, cid, compNotes[i], 0.4, velBase));
            events.push(EV(barStart + b, cid, compNotes[(i + 1) % compNotes.length], 0.4, velBase * 0.85));
          }
        }
        else if (st === "batida") {
          hit(barStart, 1.0, velBase * 0.9);
          if (meter >= 2) hit(barStart + 1.5, 0.4, velBase);
          if (meter >= 3) hit(barStart + 2, 0.9, velBase * 0.85);
          if (meter === 4) hit(barStart + 3.5, 0.4, velBase * 0.9);
        }
        else if (st === "skank") { for (let b = 1; b < meter; b += 2) hit(barStart + b, 0.24, velBase * 1.1); }
        else if (st === "sixteenth") {
          for (let sIdx = 0; sIdx < meter * 4; sIdx++)
            if (chance(rng, 0.5)) hit(barStart + sIdx / 4, 0.18, velBase * 0.72);
        }
        else if (st === "rasgueado") {
          [0, 1.5, 2, 3, 3.5].forEach((b) => {
            if (b >= meter) return;
            compNotes.forEach((n, i) => events.push(EV(barStart + b + i * 0.05, cid, n, 0.5,
              velBase * (b === 0 ? 1.2 : 0.95) * (i === 0 ? 1 : 0.85))));
          });
        }
      }
    }

    /* cuerdas / metales sostenidos */
    if (padIds.length || stringSustain.length) {
      const susNotes = chordMidis.map((d) => clampToRange(rootMidi + scaleNote(0, scale, d) + 12, [43, 79]));
      const targets = [...stringSustain, ...padIds.filter((p) => INSTRUMENT_MAP[p].family !== "plucked")];
      targets.forEach((pid, ti) => {
        if (inIntro && !padIds.includes(pid)) return;
        if (inIntro && ti > 1) return;
        const vel = (0.4 + energy * 0.22) * sectionGain * (inIntro ? 0.6 : 1);
        susNotes.forEach((n, i) => {
          const note = clampToRange(n, INSTRUMENT_MAP[pid].range);
          events.push(EV(barStart, pid, note, meter * (chance(rng, 0.3) ? 0.5 : 0.95), vel * (i === 0 ? 1 : 0.88)));
        });
      });
    }

    /* arpa: glissandos en entradas de sección */
    if (has("harp") && (bar === introBars || bar === introBars + aBars || bar === 0)) {
      const hRange = INSTRUMENT_MAP.harp.range;
      const run = chordMidis.map((d) => clampToRange(rootMidi + scaleNote(0, scale, d) + 24, hRange));
      run.concat(run.map((n) => clampToRange(n + 12, hRange))).forEach((n, i) =>
        events.push(EV(barStart + i * 0.16, "harp", n, 0.9, 0.5 - i * 0.02)));
    }

    /* melodía principal */
    const lead = inB ? leadB : leadA;
    if (lead && !inIntro && !inOutro) {
      const def = INSTRUMENT_MAP[lead];
      const motif = inB ? motifB : motifA;
      const shift = (bar % 4 === 3) ? pick(rng, [0, 2, -1]) : (bar % 2 === 1 ? pick(rng, [0, 1, 2]) : 0);
      motif.forEach((degOrNull, i) => {
        if (degOrNull === null) return;
        const eighth = meter / motif.length;
        let beat = barStart + i * eighth;
        if (Math.round(beat * 2) % 2 === 1) beat += swing * 0.5;
        const midi = clampToRange(scaleNote(rootMidi + 12, scale, degOrNull + shift), def.range);
        const longNote = chance(rng, 0.18);
        events.push(EV(beat, lead, midi, longNote ? eighth * 2.4 : eighth * (0.8 + rng() * 0.3),
          (0.62 + rng() * 0.22 + (analysis.leaderId === lead ? 0.1 : 0)) * sectionGain));
      });
      if (cadence) {
        const finalMidi = clampToRange(scaleNote(rootMidi + 12, scale, 7), def.range);
        events.push(EV(barStart, lead, finalMidi, meter * 1.4, 0.85));
      }
    }

    /* voces en la sección B */
    if (voiceIds.length && inB && !cadence) {
      const vid = voiceIds[bar % voiceIds.length];
      const def = INSTRUMENT_MAP[vid];
      motifB.forEach((degOrNull, i) => {
        if (degOrNull === null || chance(rng, 0.45)) return;
        const eighth = meter / motifB.length;
        const beat = barStart + i * eighth + swing * (Math.round(i * eighth * 2) % 2 ? 0.1 : 0);
        const midi = clampToRange(scaleNote(rootMidi + 12, scale, degOrNull), def.range);
        events.push(EV(beat, vid, midi, eighth * 1.6, 0.5 * sectionGain));
      });
    }

    /* cadencia final */
    if (cadence) {
      const finalChord = [0, 2, 4].map((o) => clampToRange(rootMidi + scaleNote(0, scale, o), [40, 76]));
      for (const pid of [...padIds, ...compIds, ...(bassId ? [bassId] : [])]) {
        finalChord.forEach((n) => events.push(EV(barStart, pid, clampToRange(n, INSTRUMENT_MAP[pid].range), meter * 1.6, 0.6)));
      }
      if (has("drumkit")) events.push(EV(barStart, "drumkit", 49, 1.6, 0.75));
    }
    void barGenreId;
  }

  events.sort((a, b) => a.beat - b.beat);
  const totalBeats = bars * meter;

  return {
    seed,
    events,
    bpm,
    meter,
    bars,
    totalBeats,
    durationSec: (totalBeats / bpm) * 60 + 1.2,
    moodKey: analysis.moodKey,
    title: generateTitle(analysis, seed, lang),
    rain: analysis.rain,
    swing,
    genreId: genre.id,
    fusionIds,
    space,
    bright,
  };
}

/* ---------------- títulos generados ---------------- */

const TITLE_POOLS: Record<string, { es: string[]; en: string[] }> = {
  heroic: { es: ["Marcha del Triunfo", "Fanfarria del Alba", "Gloria en la Cumbre", "El Estandarte"], en: ["March of Triumph", "Dawn Fanfare", "Summit Glory", "The Banner"] },
  bright: { es: ["Danza del Sol", "Alegría en la Plaza", "Carrusel Dorado", "Fiesta Mayor"], en: ["Sun Dance", "Square of Joy", "Golden Carousel", "Grand Fiesta"] },
  love: { es: ["Romance de Primavera", "Cartas al Amanecer", "Vals de tus Ojos"], en: ["Spring Romance", "Letters at Dawn", "Waltz of Your Eyes"] },
  melancholy: { es: ["Elegía de Cristal", "Llanto del Río", "Adiós en el Andén"], en: ["Crystal Elegy", "River Lament", "Platform Goodbye"] },
  dark: { es: ["Sombra Errante", "La Cripta", "Presagio"], en: ["Wandering Shadow", "The Crypt", "Omen"] },
  nocturne: { es: ["Nocturno de Medianoche", "Luna sobre el Puerto", "Serenata Azul"], en: ["Midnight Nocturne", "Moon over the Harbor", "Blue Serenade"] },
  jazzy: { es: ["Humo y Neón", "Esquina con Swing", "Terciopelo Azul"], en: ["Smoke & Neon", "Swing Corner", "Blue Velvet"] },
  calm: { es: ["Aire Sereno", "Camino de Nubes", "Manantial"], en: ["Serene Air", "Cloud Path", "Springwater"] },
};

export function generateTitle(a: PromptAnalysis, seed: number, lang: Lang): string {
  const pool = TITLE_POOLS[a.moodKey] ?? TITLE_POOLS.calm;
  const list = lang === "es" ? pool.es : pool.en;
  const title = list[seed % list.length];
  const op = (seed % 40) + 3;
  return a.rain ? `${title} ${lang === "es" ? "(bajo la lluvia)" : "(in the rain)"}` : `${title}, Op. ${op}`;
}

/* ---------------- parámetros por defecto ---------------- */

export function defaultParams(orch: Pick<Orchestra, "genreId" | "fusions">): GenParams {
  const gs = fusedGenres(orch);
  const [mn, mx] = fusedBpmRange(orch);
  let sp = 0, br = 0, w = 0;
  for (const g of gs) {
    const [s, b] = spaceBrightOf(g.id);
    const weight = g === gs[0] ? 2 : 1;
    sp += s * weight; br += b * weight; w += weight;
  }
  return {
    bpm: clamp(gs[0].bpm, mn, mx),
    energy: Math.round((gs.reduce((s, g) => s + g.energy, 0) / gs.length) * 100) / 100,
    swing: Math.round((gs.reduce((s, g) => s + g.swing, 0) / gs.length) * 100) / 100,
    space: Math.round((sp / w) * 100) / 100,
    bright: Math.round((br / w) * 100) / 100,
  };
}
