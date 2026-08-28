import { jsPDF } from "jspdf";
import type { Composition, Lang } from "./core";

/* ============================================================
   GENERADOR DE PARTITURA PDF
   Dibuja vectorialmente una hoja de melodía (pentagrama en Sol),
   con notas, compases, armadura de compás, caldereta y —cuando la
   obra tiene letra— las sílabas alineadas bajo cada nota.
   ============================================================ */

export interface ScoreOptions {
  title: string;
  subtitle: string;
  showLyrics: boolean;
  lang: Lang;
}

/* ---------------- silabificación (aprox. ES/EN) ---------------- */
const VOWELS = "aeiouyáéíóúüAEIOUYÁÉÍÓÚÜ";
const isVowel = (c: string) => VOWELS.includes(c);

export interface Syllable { text: string; endsWord: boolean; }

export function syllabify(text: string): Syllable[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const out: Syllable[] = [];
  for (const word of words) {
    const syl = splitWord(word);
    syl.forEach((s, i) => out.push({ text: s, endsWord: i === syl.length - 1 }));
  }
  return out;
}

function splitWord(word: string): string[] {
  const chars = [...word];
  const n = chars.length;
  // núcleos vocálicos (corridas máximas de vocales)
  const nuclei: number[] = []; // índice donde inicia cada núcleo
  for (let i = 0; i < n; i++) {
    if (isVowel(chars[i]) && (i === 0 || !isVowel(chars[i - 1]))) nuclei.push(i);
  }
  if (nuclei.length === 0) return [word];
  if (nuclei.length === 1) return [word];
  const bounds: number[] = [0];
  for (let k = 1; k < nuclei.length; k++) {
    const cur = nuclei[k];
    // cuenta consonantes entre el núcleo anterior y este
    let cons = 0;
    let j = cur - 1;
    while (j >= 0 && !isVowel(chars[j])) { cons++; j--; }
    // reparto onset: la última consonante abre la nueva sílaba
    const take = cons >= 2 ? 1 : cons; // si hay 2+, deja 1 con la anterior (simplificado)
    bounds.push(cur - take);
  }
  bounds.push(n);
  const parts: string[] = [];
  for (let k = 0; k < bounds.length - 1; k++) {
    const s = chars.slice(bounds[k], bounds[k + 1]).join("");
    if (s) parts.push(s);
  }
  return parts.length ? parts : [word];
}

/* ---------------- MIDI → posición diatónica en el pentagrama ---------------- */
const STEP: Record<number, number> = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5, 10: 5, 11: 6 };
const SHARP = new Set([1, 3, 6, 8, 10]);
const E4_DIATONIC = 30; // E4 = línea inferior del pentagrama en Sol

interface StaffNote {
  midi: number;
  pos: number;      // 0 = línea inferior (E4), +1 por cada media distancia
  accidental: string; // "", "#", "b"
}

function toStaff(midi: number): StaffNote {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const diatonic = octave * 7 + STEP[pc];
  return { midi, pos: diatonic - E4_DIATONIC, accidental: SHARP.has(pc) ? "#" : "" };
}

/* valor de nota a partir de la duración en beats */
type NoteValue = "whole" | "half" | "quarter" | "eighth";
function noteValue(durBeats: number): NoteValue {
  if (durBeats >= 3) return "whole";
  if (durBeats >= 1.5) return "half";
  if (durBeats >= 0.75) return "quarter";
  return "eighth";
}

/* ---------------- dibujo de la caldereta (clave de Sol estilizada) ---------------- */
function drawTrebleClef(doc: jsPDF, x: number, bottomY: number, s: number) {
  const lw = doc.getLineWidth();
  doc.setLineWidth(s * 0.14);
  // espiral inferior
  doc.circle(x, bottomY - 0.6 * s, s * 0.9, "S");
  // cuerpo vertical con curva
  const topY = bottomY - 7.6 * s;
  doc.line(x + s * 0.55, bottomY - 0.2 * s, x + s * 0.55, topY + 1.2 * s);
  doc.circle(x + s * 0.2, topY + 0.6 * s, s * 0.75, "S");
  // gancho inferior
  doc.circle(x + s * 0.1, bottomY + 0.9 * s, s * 0.55, "S");
  doc.setLineWidth(lw);
}

/* dibujar un número de compás (armadura) apilado */
function drawTimeSig(doc: jsPDF, x: number, bottomY: number, s: number, meter: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const midY = bottomY - 2 * s; // línea central (B4)
  doc.text(String(meter), x, midY - s * 0.55, { align: "center" });
  doc.text("4", x, midY + s * 1.45, { align: "center" });
}

/* ---------------- render principal ---------------- */
export function buildScorePdf(comp: Composition, opts: ScoreOptions): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297;
  const M = 16; // margen
  const usableW = W - M * 2;

  /* canal de melodía: voz si hay letra, si no el líder */
  const melodic = pickMelodyChannel(comp);
  const notes = comp.events
    .filter((e) => e.ch === melodic)
    .sort((a, b) => a.beat - b.beat)
    .map((e) => ({ beat: e.beat, midi: e.midi, dur: e.dur, staff: toStaff(e.midi) }));

  /* cabecera */
  doc.setTextColor(20, 18, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(opts.title, W / 2, 20, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(110, 104, 128);
  doc.text(opts.subtitle, W / 2, 27, { align: "center" });
  // indicación de tempo
  doc.setFontSize(10);
  doc.setTextColor(40, 36, 48);
  doc.text(`= ${comp.bpm} BPM`, W - M, 20, { align: "right" });

  /* letra: asignar sílabas a notas por líneas */
  let lyricByNote = new Map<number, string>(); // índice de nota -> sílaba
  const withLyrics = opts.showLyrics && !!comp.lyricMap && comp.lyricMap.length > 0;
  if (withLyrics && comp.lyricMap) {
    comp.lyricMap.forEach((line) => {
      const idxs: number[] = [];
      notes.forEach((nt, i) => { if (nt.beat >= line.startBeat && nt.beat < line.endBeat) idxs.push(i); });
      if (!idxs.length) return;
      const syls = syllabify(line.line);
      idxs.forEach((noteIdx, k) => {
        const s = syls[k];
        if (!s) return;
        lyricByNote.set(noteIdx, s.endsWord ? s.text : s.text + "-");
      });
    });
  }

  /* geometría del pentagrama */
  const s = 2.1;                 // distancia entre líneas (mm)
  const half = s / 2;
  const staffTopExtra = 10;      // espacio sobre el pentagrama
  const measuresPerRow = pickMeasuresPerRow(comp.meter, usableW);
  const rowMeasureW = usableW / measuresPerRow;
  const rowH = 8 * half + staffTopExtra + (withLyrics ? 12 : 0) + 14;
  let y0 = 40;                   // Y de la línea superior del primer pentagrama
  const rowsPerPage = Math.max(1, Math.floor((H - M - y0) / rowH));

  const totalMeasures = comp.bars;
  let measure = 0;
  let rowOnPage = 0;

  while (measure < totalMeasures) {
    if (rowOnPage >= rowsPerPage) { doc.addPage(); y0 = M + 6; rowOnPage = 0; }
    const bottomY = y0 + 8 * half; // línea inferior (E4)

    // líneas del pentagrama
    doc.setDrawColor(60, 56, 72);
    doc.setLineWidth(0.25);
    for (let l = 0; l < 5; l++) doc.line(M, y0 + l * 2 * half, M + usableW, y0 + l * 2 * half);

    // caldereta al inicio de cada renglón
    drawTrebleClef(doc, M + 5, bottomY, s);
    const startX = M + 13;
    if (measure === 0) drawTimeSig(doc, startX + 3, bottomY, s, comp.meter);
    const noteAreaX = measure === 0 ? startX + 9 : startX;
    const noteAreaW = M + usableW - noteAreaX;

    // número de compás sobre el primer compás del renglón
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140, 134, 156);
    doc.text(String(measure + 1), noteAreaX + 1, y0 - 2.2);

    const rowEnd = Math.min(measure + measuresPerRow, totalMeasures);
    const rowMeasures = rowEnd - measure;
    const mw = noteAreaW / rowMeasures;

    for (let m = measure; m < rowEnd; m++) {
      const mx = noteAreaX + (m - measure) * mw;
      // líneas divisorias
      doc.setDrawColor(60, 56, 72);
      doc.setLineWidth(m === rowEnd - 1 && rowEnd === totalMeasures ? 0.7 : 0.3);
      doc.line(mx + mw, y0, mx + mw, bottomY);

      // notas del compás
      const inBar = notes.filter((nt) => {
        const b = nt.beat - m * comp.meter;
        return b >= 0 && b < comp.meter;
      });
      const innerW = mw - 6;
      let lastBeat = -1;
      inBar.forEach((nt, i) => {
        const beatInBar = nt.beat - m * comp.meter;
        let nx = mx + 4 + (comp.meter > 1 ? (beatInBar / comp.meter) * innerW : innerW / 2);
        if (Math.abs(nt.beat - lastBeat) < 0.01) nx += 2.2; // superposición mínima
        lastBeat = nt.beat;
        drawNote(doc, nx, bottomY, nt.staff, noteValue(nt.dur), s);

        // sílaba bajo la nota
        const gIdx = notes.indexOf(nt);
        const syl = lyricByNote.get(gIdx);
        if (syl) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(40, 36, 48);
          doc.text(syl, nx, bottomY + 7.5, { align: "center" });
        }
      });
    }

    // doble barra final
    if (rowEnd === totalMeasures) {
      doc.setLineWidth(0.3);
      doc.line(M + usableW - 2.2, y0, M + usableW - 2.2, bottomY);
    }

    measure = rowEnd;
    y0 += rowH;
    rowOnPage++;
  }

  /* pie */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(140, 134, 156);
    doc.text(
      opts.lang === "es"
        ? `Partitura generada por Ecosistema Sónico — página ${p} de ${pages}`
        : `Score generated by Sonic Ecosystem — page ${p} of ${pages}`,
      W / 2, H - 9, { align: "center" },
    );
  }

  return doc.output("blob");
}

/* elige el canal melódico a transcribir */
function pickMelodyChannel(comp: Composition): string {
  if (comp.singerId && comp.lyricMap?.length) return comp.singerId;
  if (comp.leadId) return comp.leadId;
  // el canal con más eventos melódicos
  const counts = new Map<string, number>();
  for (const e of comp.events) counts.set(e.ch, (counts.get(e.ch) ?? 0) + 1);
  let best = "", n = -1;
  for (const [ch, c] of counts) { if (c > n) { n = c; best = ch; } }
  return best;
}

function pickMeasuresPerRow(meter: number, usableW: number): number {
  const target = meter === 3 ? 40 : meter === 2 ? 34 : 44;
  return Math.max(2, Math.min(6, Math.floor(usableW / target)));
}

/* dibuja una nota (cabeza + plica + corchete/puntillo según valor) */
function drawNote(doc: jsPDF, x: number, bottomY: number, st: StaffNote, value: NoteValue, s: number) {
  const half = s / 2;
  const y = bottomY - st.pos * half;
  const filled = value === "quarter" || value === "eighth";
  const rx = 1.55, ry = 1.15;

  doc.setDrawColor(30, 27, 38);
  doc.setLineWidth(0.3);

  // líneas adicionales
  if (st.pos <= -2) {
    for (let p = -2; p >= st.pos; p -= 2) doc.line(x - 3.2, bottomY - p * half, x + 3.2, bottomY - p * half);
  }
  if (st.pos >= 10) {
    for (let p = 10; p <= st.pos; p += 2) doc.line(x - 3.2, bottomY - p * half, x + 3.2, bottomY - p * half);
  }

  // alteración
  if (st.accidental) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 27, 38);
    doc.text("#", x - 3.4, y + 1.1);
  }

  // cabeza
  if (filled) {
    doc.setFillColor(30, 27, 38);
    doc.ellipse(x, y, rx, ry, "F");
  } else {
    doc.ellipse(x, y, rx, ry, "S");
  }

  // plica (todas menos la redonda)
  if (value !== "whole") {
    const up = st.pos < 4;
    doc.setLineWidth(0.35);
    if (up) doc.line(x + rx - 0.15, y - 0.4, x + rx - 0.15, y - 7.2);
    else doc.line(x - rx + 0.15, y + 0.4, x - rx + 0.15, y + 7.2);
    // corchete para corchea
    if (value === "eighth") {
      const bx = up ? x + rx - 0.15 : x - rx + 0.15;
      const by = up ? y - 7.2 : y + 7.2;
      doc.setLineWidth(0.5);
      doc.line(bx, by, bx + (up ? 2.4 : -2.4), by + (up ? 2.2 : -2.2));
    }
  }
}
