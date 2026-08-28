import type { ReactNode } from "react";

/* ============================================================
   Glifos de instrumentos dibujados (SVG de trazo),
   uno por familia/ instrumento, en lugar de círculos genéricos.
   ============================================================ */

const S = { stroke: "currentColor", fill: "none", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const GLYPHS: Record<string, ReactNode> = {
  /* --- violín / cuerda frotada --- */
  violin: (
    <g {...S}>
      <path d="M12 2.8v4.4" />
      <path d="M10.6 4h2.8" />
      <path d="M12 7.2c-2.6 0-4.2 1.9-4.2 4.1 0 1.1.4 1.9 1.3 2.4-.5.8-.5 1.9 0 2.9.6 1.2 1.7 2 2.9 2s2.3-.8 2.9-2c.5-1 .5-2.1 0-2.9.9-.5 1.3-1.3 1.3-2.4 0-2.2-1.6-4.1-4.2-4.1z" />
      <path d="M9.6 12.2h.9M13.5 12.2h.9" />
    </g>
  ),
  cello: (
    <g {...S}>
      <path d="M12 2.5v3.8" />
      <path d="M10.8 3.4h2.4" />
      <path d="M12 6.3c-3 0-4.9 2.2-4.9 4.8 0 1.3.5 2.2 1.5 2.8-.6 1-.6 2.2 0 3.4.7 1.4 2 2.3 3.4 2.3s2.7-.9 3.4-2.3c.6-1.2.6-2.4 0-3.4 1-.6 1.5-1.5 1.5-2.8 0-2.6-1.9-4.8-4.9-4.8z" />
      <path d="M12 19.6v1.9" />
    </g>
  ),
  /* --- flauta --- */
  flute: (
    <g {...S}>
      <path d="M3.5 17.5L17 6.8" />
      <circle cx="8.6" cy="13.4" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="11" cy="11.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="13.4" cy="9.6" r="0.7" fill="currentColor" stroke="none" />
      <path d="M17.6 6.3l1.4 1.4" />
    </g>
  ),
  /* --- clarinete / saxo (tubo con campana) --- */
  clarinet: (
    <g {...S}>
      <path d="M12 3v11" />
      <path d="M12 14c0 2.2-1.6 3-1.6 5h7.2c0-2-1.6-2.8-1.6-5" />
      <circle cx="12" cy="6" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="11" r="0.6" fill="currentColor" stroke="none" />
    </g>
  ),
  sax: (
    <g {...S}>
      <path d="M14.5 3.5c-2.5 1.5-3.5 4-3.5 7v3.5c0 3-2 4.5-4 4.5" />
      <path d="M6 16.5c-1.5 0-2.5 1-2.5 2.3S4.6 21 6.2 21c2.6 0 4.8-1.8 4.8-5v-2.5" />
      <circle cx="12.6" cy="8" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12.2" cy="10.8" r="0.6" fill="currentColor" stroke="none" />
    </g>
  ),
  panpipes: (
    <g {...S}>
      <path d="M6 5v12M9.5 5v10M13 5v8M16.5 5v6" />
      <path d="M4.5 8h13.5" />
    </g>
  ),
  harmonica: (
    <g {...S}>
      <rect x="4" y="9" width="16" height="6" rx="2" />
      <path d="M7.5 9v6M11 9v6M14.5 9v6M18 9v6" opacity="0.6" />
    </g>
  ),
  bagpipe: (
    <g {...S}>
      <ellipse cx="12" cy="14.5" rx="5.5" ry="4.5" />
      <path d="M9 10.5L6.5 5M12 10V4.5M15 10.5l2.5-5.5" />
      <path d="M12 19v2" />
    </g>
  ),
  /* --- metales --- */
  horn: (
    <g {...S}>
      <circle cx="12" cy="12.5" r="6.5" />
      <circle cx="12" cy="12.5" r="3" />
      <path d="M12 6V3.5" />
    </g>
  ),
  trumpet: (
    <g {...S}>
      <path d="M3 12h11" />
      <path d="M14 12c2.5 0 4-1.5 6-4v8c-2-2.5-3.5-4-6-4z" />
      <path d="M6.5 12V8.5M9.5 12V8.5M12.5 12V8.5" />
    </g>
  ),
  trombone: (
    <g {...S}>
      <path d="M4 8h9c1.7 0 3 1.3 3 3s-1.3 3-3 3h-2" />
      <path d="M4 11h7" />
      <path d="M8 14v4.5" />
    </g>
  ),
  tuba: (
    <g {...S}>
      <path d="M9 4v6.5a4.5 4.5 0 0 0 9 0V9" />
      <path d="M18 9c0-1.7 1.3-3 3-3v0" opacity="0" />
      <ellipse cx="13.5" cy="16" rx="6" ry="4" />
      <path d="M9 6.5H7.2c-1 0-1.7.8-1.7 1.7S6.2 10 7.2 10H9" />
    </g>
  ),
  /* --- teclados --- */
  piano: (
    <g {...S}>
      <rect x="3.5" y="7" width="17" height="10" rx="1.5" />
      <path d="M7 7v6M10.5 7v6M14 7v6M17.5 7v6" />
    </g>
  ),
  organ: (
    <g {...S}>
      <rect x="4" y="5" width="16" height="13" rx="1.5" />
      <path d="M7.5 5v7M11 5v7M14.5 5v7" />
      <path d="M4 14.5h16" />
    </g>
  ),
  accordion: (
    <g {...S}>
      <rect x="3.5" y="6" width="4.5" height="12" rx="1" />
      <rect x="16" y="6" width="4.5" height="12" rx="1" />
      <path d="M8 7.5l2 1.5-2 1.5 2 1.5-2 1.5 2 1.5-2 1.5M16 7.5l-2 1.5 2 1.5-2 1.5 2 1.5-2 1.5 2 1.5" />
    </g>
  ),
  /* --- sintes --- */
  synth: (
    <g {...S}>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M6 12c1.2-2.5 2.3-2.5 3.5 0s2.3 2.5 3.5 0 2.3-2.5 3.5 0" />
      <circle cx="17.8" cy="8.5" r="0.8" fill="currentColor" stroke="none" />
    </g>
  ),
  /* --- guitarras --- */
  guitar: (
    <g {...S}>
      <path d="M13.5 3l3 3-4.2 4.2" />
      <path d="M12.3 10.2c1.4 1.4 1.5 3.5.2 5.1-.4.5-.4 1.2 0 1.9.7 1.2.5 2.8-.7 3.9-1.5 1.3-3.9 1.2-5.4-.3s-1.6-3.9-.3-5.4c1.1-1.2 2.7-1.4 3.9-.7.7.4 1.4.4 1.9 0 1.6-1.3 3.7-1.2 5.1.2z" transform="translate(-2.2 -2.2) scale(0.92)" />
      <circle cx="10.6" cy="13.4" r="1.4" />
    </g>
  ),
  charango: (
    <g {...S}>
      <path d="M13.8 2.8l2.6 2.6-3.6 3.6" />
      <ellipse cx="10" cy="13.5" rx="5" ry="5.6" />
      <circle cx="10" cy="13.5" r="1.5" />
    </g>
  ),
  harp: (
    <g {...S}>
      <path d="M7 3.5c6 1 9 5.5 9 13" />
      <path d="M7 3.5v14.5l9-1.5" />
      <path d="M9.5 6.5v12M12 9.5v9.3M14.3 13v5" opacity="0.7" />
    </g>
  ),
  /* --- percusión --- */
  drum: (
    <g {...S}>
      <ellipse cx="12" cy="7.5" rx="7" ry="3" />
      <path d="M5 7.5v9c0 1.7 3.1 3 7 3s7-1.3 7-3v-9" />
      <path d="M5 10l4 4.5M19 10l-4 4.5" opacity="0.7" />
    </g>
  ),
  drumkit: (
    <g {...S}>
      <circle cx="9" cy="14.5" r="4.5" />
      <circle cx="17.5" cy="12" r="2.8" />
      <path d="M4 6.5l3 3M20 5.5l-2.5 2.8" />
      <ellipse cx="5.5" cy="5.5" rx="2" ry="0.9" />
    </g>
  ),
  timpani: (
    <g {...S}>
      <ellipse cx="12" cy="8" rx="7" ry="2.6" />
      <path d="M5 8c0 4 3 8 7 8s7-4 7-8" />
      <path d="M12 16v4" />
    </g>
  ),
  conga: (
    <g {...S}>
      <ellipse cx="12" cy="5.5" rx="4.5" ry="2" />
      <path d="M7.5 5.5L6.5 19c0 .8 2.5 1.8 5.5 1.8s5.5-1 5.5-1.8L16.5 5.5" />
      <path d="M7.2 11h9.6" opacity="0.7" />
    </g>
  ),
  shaker: (
    <g {...S}>
      <ellipse cx="12" cy="12" rx="4" ry="7.5" transform="rotate(28 12 12)" />
      <circle cx="10.5" cy="9.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="13" cy="12.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="15" r="0.6" fill="currentColor" stroke="none" />
    </g>
  ),
  claves: (
    <g {...S}>
      <path d="M5 16.5L16.5 5" />
      <path d="M8.5 19L19 8.5" />
    </g>
  ),
  cajon: (
    <g {...S}>
      <rect x="6" y="4.5" width="12" height="15" rx="1.5" />
      <circle cx="12" cy="14.5" r="2.6" />
      <path d="M6 8h12" opacity="0.6" />
    </g>
  ),
  palmas: (
    <g {...S}>
      <path d="M8 20v-7.5L6 10.8a1.3 1.3 0 0 1 2-1.6L9.5 11V5.5a1.3 1.3 0 0 1 2.6 0V10" />
      <path d="M12.1 10V4.8a1.3 1.3 0 0 1 2.6 0V10.5" />
      <path d="M14.7 10.8V6.5a1.3 1.3 0 0 1 2.6 0V13c0 4-2.2 7-5.6 7-2.6 0-3.7-1.4-3.7-3.5" />
    </g>
  ),
  scraper: (
    <g {...S}>
      <rect x="4" y="10" width="16" height="4.5" rx="2.2" />
      <path d="M7 10v4.5M9.7 10v4.5M12.4 10v4.5M15.1 10v4.5M17.8 10v4.5" opacity="0.7" />
    </g>
  ),
  furruco: (
    <g {...S}>
      <path d="M7 8.5h10l1.5 10h-13z" />
      <ellipse cx="12" cy="8.5" rx="5" ry="1.8" />
      <path d="M12 10.5v8" />
      <circle cx="12" cy="19.5" r="1.2" />
    </g>
  ),
  jawbone: (
    <g {...S}>
      <path d="M4 15c0-4.5 3.6-8 8-8s8 3.5 8 8" />
      <path d="M6.5 15.5l.8-2M9.5 16.5l.6-2.2M12.5 16.8l.4-2.3M15.5 16.3l-.2-2.3M18 15.2l-.7-2" />
    </g>
  ),
  /* --- voces --- */
  voice: (
    <g {...S}>
      <circle cx="9" cy="16.5" r="2.6" />
      <path d="M11.6 16.5V6.5l6.4-1.7v9.7" />
      <circle cx="15.4" cy="14.5" r="2.6" />
      <path d="M4 6.5c.8-.8 1.7-.8 2.5 0" opacity="0.7" />
    </g>
  ),
};

/* fallback por familia */
const FAMILY_GLYPH: Record<string, string> = {
  strings: "violin", brass: "horn", winds: "flute", keys: "piano",
  plucked: "guitar", synth: "synth", percussion: "drum", drums: "drumkit", voice: "voice",
};

/* alias por instrumento id → glifo */
const ID_GLYPH: Record<string, string> = {
  violin: "violin", viola: "violin", cello: "cello", contrabass: "cello",
  flute: "flute", clarinet: "clarinet", oboe: "clarinet", bassoon: "clarinet",
  saxtenor: "sax", zampona: "panpipes", quena: "flute", gaitacolo: "flute",
  harmonica: "harmonica", gaita: "bagpipe",
  horn: "horn", trumpet: "trumpet", trombone: "trombone", tuba: "tuba",
  piano: "piano", epiano: "piano", organ: "organ", celesta: "piano",
  accordion: "accordion", bandoneon: "accordion", harmonium: "organ",
  synthlead: "synth", synthpad: "synth", synthbass: "synth",
  harp: "harp", harpandes: "harp", harpllanera: "harp",
  nylon: "guitar", flamencog: "guitar", eguitar: "guitar", vihuela: "guitar",
  guitarron: "guitar", ebass: "guitar", charango: "charango", mandolin: "charango",
  cuatro: "charango", kora: "harp", ngoni: "charango", balalaika: "charango",
  sitar: "guitar", koto: "harp",
  drumkit: "drumkit", snareline: "drum", bassdrum: "drum",
  timpani: "timpani", congas: "conga", claves: "claves", shaker: "shaker",
  tambourine: "shaker", cowbell: "scraper", cajon: "cajon", palmas: "palmas",
  castanets: "claves", guiro: "scraper", guira: "scraper", tambora: "drum",
  djembe: "conga", tabla: "drum", bodhran: "drum", timbales: "drum",
  leguero: "drum", quijada: "jawbone", cajita: "cajon", cajavallenata: "drum",
  bomba: "drum", furruco: "furruco",
  soprano: "voice", alto: "voice", tenor: "voice", basso: "voice",
};

export function InstrumentGlyph({ id, family, color, size = 18, glow = false }: {
  id: string; family: string; color: string; size?: number; glow?: boolean;
}) {
  const key = ID_GLYPH[id] ?? FAMILY_GLYPH[family] ?? "voice";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      style={glow ? { color, filter: `drop-shadow(0 0 3px ${color})` } : { color }}>
      {GLYPHS[key] ?? GLYPHS.voice}
    </svg>
  );
}
